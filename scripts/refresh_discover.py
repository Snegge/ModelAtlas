"""Refresh Discover metadata for existing catalog releases; never modifies catalog records."""
import concurrent.futures, datetime, json, urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
def fetch(release):
    base = "https://huggingface.co/api/models/" + release["releaseIdentifier"]
    def get(url):
        with urllib.request.urlopen(url, timeout=25) as response:
            return json.load(response)
    model = get(base)
    discussions = get(base + "/discussions")
    created = model.get("createdAt")
    downloads = model.get("downloads")
    count = discussions.get("count")
    assert isinstance(created, str) and isinstance(downloads, int) and isinstance(count, int)
    return dict(id=release["id"], createdAt=created, downloads=downloads, discussions=count,
                source="https://huggingface.co/" + release["releaseIdentifier"])
if __name__ == "__main__":
    releases = json.loads((root / "data/catalog.json").read_text(encoding="utf-8"))["releases"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(fetch, releases))
    assert len({r["id"] for r in rows}) == len(releases)
    snapshot = dict(retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), models=rows)
    (root / "client/src/app/discover-metadata.ts").write_text(
        "export const DISCOVER_METADATA = " + json.dumps(snapshot, indent=2) + ";\n", encoding="utf-8")
    print("Saved metadata for", len(rows), "existing releases")

