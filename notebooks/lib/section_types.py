from __future__ import annotations

from dataclasses import dataclass


@dataclass
class StoredNoteSection:
    id: str
    title: str
    startChar: int
    endChar: int
