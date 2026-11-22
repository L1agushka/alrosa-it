"""Reproducible synthetic demonstration. Run: python scripts/demo.py"""
import argparse
import json
import os
from pathlib import Path
import httpx


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost")
    parser.add_argument("--large", action="store_true", help="120 synthetic workstations for presentation screenshots")
    args = parser.parse_args()
    with httpx.Client(base_url=args.base_url, timeout=60) as client:
        login = client.post("/api/v1/auth/token", data={
            "username": os.getenv("DEMO_EMAIL", "admin@alrosa.ru"),
            "password": os.getenv("DEMO_PASSWORD", "admin123"),
        })
        login.raise_for_status()
        client.headers["Authorization"] = "Bearer " + login.json()["access_token"]
        weights = {"ram":30, "cpu":25, "disk":20, "blocker_software":100, "unknown_software":5}
        for name, ram in [("Демо: офис",4), ("Демо: инженеры",16), ("Демо: бухгалтерия",4)]:
            res = client.put("/api/v1/criteria/groups/" + name, json={
                "minRam":ram, "minCores":2, "minDisk":30, "maxGap":20, "weights":weights})
            res.raise_for_status()
        for group, status in [("Демо: офис","native_ready"), ("Демо: инженеры","blocker")]:
            res = client.post("/api/v1/policy/custom-rules",params={"group":group},json={
                "pattern":"democad", "software_name":"DemoCAD", "category":"Учебный пример",
                "status":status, "weight":100 if status == "blocker" else 0,
                "note":"Демонстрационное правило. Не является рекомендацией совместимости реального ПО.",
                "alternative":"Проверка совместимости / согласованная замена"})
            if res.status_code != 409:
                res.raise_for_status()
        filename = "demo_large.csv" if args.large else "demo_groups.csv"
        data = (Path(__file__).parent / filename).read_bytes()
        res = client.post("/api/v1/audit/upload",files={"file":(filename,data,"text/csv")})
        res.raise_for_status()
        report = res.json()
        assert [w["wave"] for w in report["workstations"][:6]] == [1,3,2,2,3,1], report
        history = client.get(f'/api/v1/audit/history/{report["id"]}')
        history.raise_for_status()
        assert history.json()["workstations"][0]["installed_software"] == ["DemoCAD"]
        print(json.dumps({"summary":report["summary"], "workstations":[
            {"id":w["workstation_id"], "group":w["department"], "wave":w["wave"], "score":w["score"]}
            for w in report["workstations"]]},ensure_ascii=False,indent=2))


if __name__ == "__main__":
    main()

