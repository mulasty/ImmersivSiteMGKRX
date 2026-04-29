"""End-to-end scikit-learn classification pipeline.

The script loads a tabular dataset from a local path or URL, performs EDA,
builds preprocessing and feature-engineering steps, compares several models,
tunes the best candidates with cross-validation, evaluates the winner on a
hold-out split, plots diagnostics and saves the fitted model bundle to disk.

Example:
    python main.py --data-url data/customers.csv --target-column churn
"""

from __future__ import annotations

import argparse
import json
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import matplotlib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, learning_curve, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.svm import SVC

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


TARGET_CANDIDATES = (
    "target",
    "label",
    "class",
    "y",
    "outcome",
    "churn",
    "default",
    "survived",
    "species",
)


@dataclass
class DatasetSplits:
    """Container for train, validation and hold-out data."""

    X_train: pd.DataFrame
    X_valid: pd.DataFrame
    X_holdout: pd.DataFrame
    y_train: np.ndarray
    y_valid: np.ndarray
    y_holdout: np.ndarray


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train and evaluate a scikit-learn classification model.")
    parser.add_argument("--data-url", required=True, help="CSV, Parquet or Excel file path/URL.")
    parser.add_argument("--target-column", default=None, help="Target column. If omitted, a common target name or the last column is used.")
    parser.add_argument("--output-dir", default="artifacts", help="Directory for model, reports and plots.")
    parser.add_argument("--test-size", type=float, default=0.2, help="Hold-out fraction.")
    parser.add_argument("--valid-size", type=float, default=0.25, help="Validation fraction of the remaining training data.")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed.")
    parser.add_argument("--max-rows", type=int, default=None, help="Optional row cap for quick experiments.")
    return parser.parse_args()


def load_dataset(data_url: str, max_rows: int | None = None) -> pd.DataFrame:
    """Load a tabular dataset from CSV, Parquet or Excel."""

    normalized = data_url.lower().split("?")[0]
    if normalized.endswith(".parquet"):
        frame = pd.read_parquet(data_url)
    elif normalized.endswith((".xlsx", ".xls")):
        frame = pd.read_excel(data_url)
    else:
        frame = pd.read_csv(data_url)

    if max_rows is not None:
        frame = frame.head(max_rows)
    if frame.empty:
        raise ValueError("Loaded dataset is empty.")
    return frame


def infer_target(frame: pd.DataFrame, target_column: str | None) -> str:
    """Resolve the target column from user input, common names or the last column."""

    if target_column:
        if target_column not in frame.columns:
            raise ValueError(f"Target column '{target_column}' was not found. Available columns: {list(frame.columns)}")
        return target_column

    lower_to_original = {column.lower(): column for column in frame.columns}
    for candidate in TARGET_CANDIDATES:
        if candidate in lower_to_original:
            return lower_to_original[candidate]
    return frame.columns[-1]


def validate_classification_target(target: pd.Series) -> None:
    """Reject continuous targets for this classification workflow."""

    unique_count = target.nunique(dropna=True)
    if unique_count < 2:
        raise ValueError("Target must contain at least two classes.")

    unique_ratio = unique_count / max(len(target), 1)
    numeric = pd.api.types.is_numeric_dtype(target)
    if numeric and unique_count > 20 and unique_ratio > 0.1:
        raise ValueError(
            "The inferred target looks continuous. Provide a categorical target column or adapt the script for regression."
        )


def summarize_eda(frame: pd.DataFrame, target_column: str, output_dir: Path) -> dict[str, Any]:
    """Create EDA summaries and save them as JSON/CSV artifacts."""

    output_dir.mkdir(parents=True, exist_ok=True)
    numeric_frame = frame.select_dtypes(include=[np.number])
    missing = frame.isna().sum().sort_values(ascending=False)
    class_counts = frame[target_column].value_counts(dropna=False)
    class_distribution = frame[target_column].value_counts(normalize=True, dropna=False)
    correlations = numeric_frame.corr(numeric_only=True) if not numeric_frame.empty else pd.DataFrame()

    summary = {
        "shape": {"rows": int(frame.shape[0]), "columns": int(frame.shape[1])},
        "target_column": target_column,
        "missing_values_top10": missing.head(10).astype(int).to_dict(),
        "class_counts": {str(key): int(value) for key, value in class_counts.items()},
        "class_distribution": {str(key): float(value) for key, value in class_distribution.items()},
        "numeric_columns": list(numeric_frame.columns),
        "categorical_columns": list(frame.select_dtypes(exclude=[np.number]).columns),
    }

    frame.describe(include="all").transpose().to_csv(output_dir / "summary_statistics.csv")
    missing.to_csv(output_dir / "missing_values.csv", header=["missing_count"])
    if not correlations.empty:
        correlations.to_csv(output_dir / "correlations.csv")
    (output_dir / "eda_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def add_engineered_features(features: pd.DataFrame) -> pd.DataFrame:
    """Add row-level missingness and numeric aggregate features."""

    engineered = features.copy()
    numeric_columns = list(engineered.select_dtypes(include=[np.number]).columns)

    engineered["feature_missing_count"] = engineered.isna().sum(axis=1)
    if numeric_columns:
        engineered["numeric_signal_mean"] = engineered[numeric_columns].mean(axis=1)
        engineered["numeric_signal_std"] = engineered[numeric_columns].std(axis=1).fillna(0)
    else:
        engineered["numeric_signal_mean"] = 0.0
        engineered["numeric_signal_std"] = 0.0

    return engineered


def make_preprocessor(features: pd.DataFrame) -> ColumnTransformer:
    """Create preprocessing for numeric and categorical feature columns."""

    numeric_columns = list(features.select_dtypes(include=[np.number]).columns)
    categorical_columns = [column for column in features.columns if column not in numeric_columns]

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, numeric_columns),
            ("categorical", categorical_pipeline, categorical_columns),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def safe_stratify(target: np.ndarray) -> np.ndarray | None:
    """Return target for stratification only when every class has enough samples."""

    _, counts = np.unique(target, return_counts=True)
    return target if len(counts) > 1 and counts.min() >= 2 else None


def split_data(
    features: pd.DataFrame,
    target: np.ndarray,
    test_size: float,
    valid_size: float,
    random_state: int,
) -> DatasetSplits:
    """Split data into train, validation and hold-out partitions."""

    X_train_valid, X_holdout, y_train_valid, y_holdout = train_test_split(
        features,
        target,
        test_size=test_size,
        random_state=random_state,
        stratify=safe_stratify(target),
    )
    X_train, X_valid, y_train, y_valid = train_test_split(
        X_train_valid,
        y_train_valid,
        test_size=valid_size,
        random_state=random_state,
        stratify=safe_stratify(y_train_valid),
    )
    return DatasetSplits(X_train, X_valid, X_holdout, y_train, y_valid, y_holdout)


def candidate_models(random_state: int) -> dict[str, Any]:
    """Return baseline model candidates."""

    return {
        "random_forest": RandomForestClassifier(n_estimators=300, random_state=random_state, n_jobs=-1),
        "gradient_boosting": GradientBoostingClassifier(random_state=random_state),
        "svm_rbf": SVC(kernel="rbf", probability=True, random_state=random_state),
    }


def evaluate_model(model: Pipeline, X: pd.DataFrame, y: np.ndarray) -> dict[str, float]:
    """Evaluate a fitted classifier with accuracy, macro F1 and ROC-AUC."""

    predictions = model.predict(X)
    metrics = {
        "accuracy": float(accuracy_score(y, predictions)),
        "f1_macro": float(f1_score(y, predictions, average="macro")),
        "roc_auc": float("nan"),
    }

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
        try:
            if probabilities.shape[1] == 2:
                metrics["roc_auc"] = float(roc_auc_score(y, probabilities[:, 1]))
            else:
                metrics["roc_auc"] = float(roc_auc_score(y, probabilities, multi_class="ovr", average="macro"))
        except ValueError:
            metrics["roc_auc"] = float("nan")

    return metrics


def compare_models(
    preprocessor: ColumnTransformer,
    models: dict[str, Any],
    splits: DatasetSplits,
) -> pd.DataFrame:
    """Train model candidates and return validation metrics."""

    rows = []
    for name, estimator in models.items():
        pipeline = Pipeline(steps=[("preprocessor", clone(preprocessor)), ("model", estimator)])
        pipeline.fit(splits.X_train, splits.y_train)
        metrics = evaluate_model(pipeline, splits.X_valid, splits.y_valid)
        rows.append({"model": name, **metrics})
    return pd.DataFrame(rows).sort_values(["f1_macro", "accuracy"], ascending=False)


def parameter_grids() -> dict[str, dict[str, list[Any]]]:
    """Return compact hyperparameter grids for cross-validation."""

    return {
        "random_forest": {
            "model__n_estimators": [200, 400],
            "model__max_depth": [None, 8, 16],
            "model__min_samples_leaf": [1, 3],
        },
        "gradient_boosting": {
            "model__n_estimators": [100, 200],
            "model__learning_rate": [0.03, 0.1],
            "model__max_depth": [2, 3],
        },
        "svm_rbf": {
            "model__C": [0.5, 1.0, 3.0],
            "model__gamma": ["scale", "auto"],
        },
    }


def tune_models(
    preprocessor: ColumnTransformer,
    models: dict[str, Any],
    grids: dict[str, dict[str, list[Any]]],
    X: pd.DataFrame,
    y: np.ndarray,
    random_state: int,
) -> tuple[str, Pipeline, pd.DataFrame]:
    """Tune all model candidates with stratified cross-validation."""

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    rows = []
    best_name = ""
    best_score = -np.inf
    best_estimator: Pipeline | None = None

    for name, estimator in models.items():
        pipeline = Pipeline(steps=[("preprocessor", clone(preprocessor)), ("model", estimator)])
        search = GridSearchCV(
            pipeline,
            grids[name],
            scoring="f1_macro",
            cv=cv,
            n_jobs=-1,
            refit=True,
            error_score="raise",
        )
        search.fit(X, y)
        rows.append({"model": name, "cv_f1_macro": float(search.best_score_), "best_params": search.best_params_})
        if search.best_score_ > best_score:
            best_name = name
            best_score = float(search.best_score_)
            best_estimator = search.best_estimator_

    if best_estimator is None:
        raise RuntimeError("No model was successfully tuned.")

    return best_name, best_estimator, pd.DataFrame(rows).sort_values("cv_f1_macro", ascending=False)


def plot_feature_importance(model: Pipeline, X: pd.DataFrame, y: np.ndarray, output_path: Path) -> None:
    """Save a feature-importance or permutation-importance plot."""

    preprocessor = model.named_steps["preprocessor"]
    estimator = model.named_steps["model"]
    feature_names = preprocessor.get_feature_names_out()

    if hasattr(estimator, "feature_importances_"):
        importances = estimator.feature_importances_
    else:
        transformed = preprocessor.transform(X)
        result = permutation_importance(estimator, transformed, y, n_repeats=5, random_state=42, scoring="f1_macro")
        importances = result.importances_mean

    order = np.argsort(importances)[-20:]
    plt.figure(figsize=(10, 7))
    plt.barh(np.array(feature_names)[order], np.array(importances)[order])
    plt.title("Top feature importances")
    plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig(output_path, dpi=160)
    plt.close()


def plot_learning_curve(model: Pipeline, X: pd.DataFrame, y: np.ndarray, output_path: Path, random_state: int) -> None:
    """Save a macro-F1 learning curve plot."""

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    train_sizes, train_scores, valid_scores = learning_curve(
        model,
        X,
        y,
        cv=cv,
        scoring="f1_macro",
        n_jobs=-1,
        train_sizes=np.linspace(0.2, 1.0, 5),
    )

    plt.figure(figsize=(8, 6))
    plt.plot(train_sizes, train_scores.mean(axis=1), marker="o", label="Training F1 macro")
    plt.plot(train_sizes, valid_scores.mean(axis=1), marker="o", label="CV F1 macro")
    plt.title("Learning curve")
    plt.xlabel("Training examples")
    plt.ylabel("F1 macro")
    plt.legend()
    plt.grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(output_path, dpi=160)
    plt.close()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    frame = load_dataset(args.data_url, args.max_rows)
    target_column = infer_target(frame, args.target_column)
    frame = frame.dropna(subset=[target_column]).reset_index(drop=True)
    validate_classification_target(frame[target_column])

    eda_summary = summarize_eda(frame, target_column, output_dir)

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(frame[target_column].astype(str))
    X = add_engineered_features(frame.drop(columns=[target_column]))

    splits = split_data(X, y, args.test_size, args.valid_size, args.random_state)
    preprocessor = make_preprocessor(splits.X_train)
    models = candidate_models(args.random_state)

    validation_results = compare_models(preprocessor, models, splits)
    validation_results.to_csv(output_dir / "validation_model_comparison.csv", index=False)

    X_train_valid = pd.concat([splits.X_train, splits.X_valid], axis=0)
    y_train_valid = np.concatenate([splits.y_train, splits.y_valid])
    best_name, best_model, tuning_results = tune_models(
        preprocessor,
        models,
        parameter_grids(),
        X_train_valid,
        y_train_valid,
        args.random_state,
    )

    tuning_results.to_csv(output_dir / "cv_tuning_results.csv", index=False)
    holdout_metrics = evaluate_model(best_model, splits.X_holdout, splits.y_holdout)

    plot_feature_importance(best_model, splits.X_holdout, splits.y_holdout, output_dir / "feature_importance.png")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        plot_learning_curve(best_model, X_train_valid, y_train_valid, output_dir / "learning_curve.png", args.random_state)

    bundle = {
        "model": best_model,
        "label_encoder": label_encoder,
        "target_column": target_column,
        "classes": list(label_encoder.classes_),
        "engineered_features": ["feature_missing_count", "numeric_signal_mean", "numeric_signal_std"],
        "eda_summary": eda_summary,
        "holdout_metrics": holdout_metrics,
    }
    joblib.dump(bundle, output_dir / "best_model.joblib")

    report = {
        "best_model": best_name,
        "holdout_metrics": holdout_metrics,
        "validation_results": validation_results.to_dict(orient="records"),
        "tuning_results": tuning_results.to_dict(orient="records"),
        "feature_engineering_rationale": {
            "feature_missing_count": "Rows with more missing inputs can represent lower data quality or specific operational segments.",
            "numeric_signal_mean": "A compact aggregate magnitude signal across numeric predictors.",
            "numeric_signal_std": "A compact variability signal across numeric predictors.",
        },
    }
    (output_dir / "model_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
