from pathlib import Path
import csv


PROJECT_DIR = Path(__file__).resolve().parent
IMAGES_DIR = PROJECT_DIR / "data" / "images"
LABELS_FILE = PROJECT_DIR / "data" / "labels" / "head_boxes.csv"


def main():
    if not LABELS_FILE.exists():
        raise FileNotFoundError(f"Missing labels file: {LABELS_FILE}")

    image_files = {
        path.name
        for path in IMAGES_DIR.iterdir()
        if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    }

    head_boxes = []
    missing_images = set()
    bad_rows = []

    with LABELS_FILE.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row_number, row in enumerate(reader, start=2):
            filename = row.get("filename", "").strip()
            if not filename:
                bad_rows.append((row_number, "filename is empty"))
                continue

            if filename not in image_files:
                missing_images.add(filename)

            try:
                xmin = int(row["xmin"])
                ymin = int(row["ymin"])
                xmax = int(row["xmax"])
                ymax = int(row["ymax"])
            except (KeyError, ValueError):
                bad_rows.append((row_number, "box values must be whole numbers"))
                continue

            if xmin < 0 or ymin < 0 or xmax <= xmin or ymax <= ymin:
                bad_rows.append((row_number, "box coordinates are invalid"))
                continue

            head_boxes.append((filename, xmin, ymin, xmax, ymax))

    labeled_images = {box[0] for box in head_boxes}

    print("Images found:", len(image_files))
    print("Images with labels:", len(labeled_images))
    print("Head boxes found:", len(head_boxes))
    print("Missing labeled images:", len(missing_images))
    print("Bad label rows:", len(bad_rows))

    if missing_images:
        print("\nMissing files listed in labels:")
        for filename in sorted(missing_images):
            print("-", filename)

    if bad_rows:
        print("\nBad rows:")
        for row_number, problem in bad_rows:
            print(f"- Row {row_number}: {problem}")

    if not image_files:
        print("\nAdd bus/passenger images to:", IMAGES_DIR)

    if not head_boxes:
        print("Add real head boxes to:", LABELS_FILE)


if __name__ == "__main__":
    main()
