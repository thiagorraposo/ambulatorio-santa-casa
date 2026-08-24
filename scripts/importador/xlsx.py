"""Leitura e escrita mínima de XLSX, sem dependências externas."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "p": "http://schemas.openxmlformats.org/package/2006/relationships"}


def _column(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference).group(0)
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - 64
    return value


def read(path: Path) -> dict[str, list[list[str | None]]]:
    with zipfile.ZipFile(path) as archive:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(t.text or "" for t in si.findall(".//m:t", NS))
                      for si in root.findall("m:si", NS)]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
        result = {}
        for sheet in workbook.findall(".//m:sheet", NS):
            name = sheet.attrib["name"]
            target = targets[sheet.attrib[f"{{{NS['r']}}}id"]]
            target = target.lstrip("/")
            if not target.startswith("xl/"):
                target = "xl/" + target
            root = ET.fromstring(archive.read(target))
            rows: list[list[str | None]] = []
            for row in root.findall(".//m:sheetData/m:row", NS):
                cells: dict[int, str | None] = {}
                for cell in row.findall("m:c", NS):
                    index = _column(cell.attrib["r"])
                    kind = cell.attrib.get("t")
                    if kind == "inlineStr":
                        value = "".join(t.text or "" for t in cell.findall(".//m:t", NS))
                    else:
                        node = cell.find("m:v", NS)
                        value = None if node is None else node.text
                        if value is not None and kind == "s":
                            value = shared[int(value)]
                        elif value is not None and kind == "b":
                            value = "1" if value == "1" else "0"
                    cells[index] = value
                width = max(cells, default=0)
                rows.append([cells.get(i) for i in range(1, width + 1)])
            result[name] = rows
        return result
