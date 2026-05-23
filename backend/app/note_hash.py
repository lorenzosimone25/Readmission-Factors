"""Match frontend FNV-1a note version hashes (see src/features/readmission/lib/noteVersionHash.ts)."""


def fnv1a_hash(text: str) -> str:
    hash_val = 0x811C9DC5
    for ch in text:
        hash_val ^= ord(ch)
        hash_val = (hash_val * 0x01000193) & 0xFFFFFFFF
    return f"fnv1a-{hash_val:08x}"


def compute_case_note_versions(index_raw: str, readmit_raw: str) -> dict[str, str]:
    return {
        "index": fnv1a_hash(index_raw),
        "readmission": fnv1a_hash(readmit_raw),
    }


def compute_case_version_hash(index_raw: str, readmit_raw: str) -> str:
    versions = compute_case_note_versions(index_raw, readmit_raw)
    return fnv1a_hash(f"{versions['index']}\n---\n{versions['readmission']}")
