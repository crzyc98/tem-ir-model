"""GlobalDefaultsStore — read/write ~/.retiremodel/global_defaults.yaml."""

from pathlib import Path

import yaml

from api.models.global_defaults import GlobalDefaults


class GlobalDefaultsStore:
    """Persists GlobalDefaults to a YAML file at base_path/global_defaults.yaml.

    Falls back to hardcoded GlobalDefaults() on a missing or corrupted file.
    """

    def __init__(self, base_path: Path) -> None:
        self._path = base_path / "global_defaults.yaml"

    def load(self) -> GlobalDefaults:
        """Load global defaults from YAML.

        Returns GlobalDefaults() (system defaults) if the file does not exist
        or cannot be parsed.
        """
        if not self._path.exists():
            return GlobalDefaults()
        try:
            data = yaml.safe_load(self._path.read_text(encoding="utf-8")) or {}
            return GlobalDefaults.model_validate(data)
        except Exception:
            return GlobalDefaults()

    def save(self, defaults: GlobalDefaults) -> GlobalDefaults:
        """Persist defaults to YAML. Returns the saved record."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            yaml.safe_dump(
                defaults.model_dump(),
                default_flow_style=False,
                allow_unicode=True,
            ),
            encoding="utf-8",
        )
        return defaults

    def reset(self) -> GlobalDefaults:
        """Delete the YAML file and return system defaults."""
        if self._path.exists():
            self._path.unlink()
        return GlobalDefaults()
