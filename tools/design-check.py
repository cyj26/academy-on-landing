"""디자인 기준 비교.

사용법
  python3 tools/design-check.py            # 기준과 비교 (차이가 크면 실패)
  python3 tools/design-check.py --update   # 승인된 디자인 변경 후 기준 갱신

확인하는 것
  1. :root 색 토큰이 DESIGN.md 기준과 같은지
  2. 주요 화면(모바일·데스크톱)이 기준 캡처와 얼마나 다른지
  3. 모바일 가로 넘침이 없는지
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "mobile" / "index.html"
BASE = ROOT / "design-baseline"
OUT = ROOT / "design-check-out"
THRESHOLD = 0.02  # 화면 픽셀 2% 이상 바뀌면 경고

TOKENS = {
    "--cream": "#fff9eb", "--cream-2": "#f7f0df", "--ink": "#17372f", "--ink-2": "#49645c",
    "--green": "#12856f", "--green-dark": "#075d4e", "--mint": "#81dfbd", "--mint-pale": "#dcf7ea",
    "--yellow": "#ffd85f", "--orange": "#ff9b57", "--red": "#f15f68", "--white": "#fffefb",
}

VIEWS = [
    ("mobile", 390, 844, ".hero"),
    ("mobile", 390, 844, ".story-step.critical"),
    ("mobile", 390, 844, ".benefits"),
    ("mobile", 390, 844, ".calculator"),
    ("mobile", 390, 844, "#survey"),
    ("desktop", 1280, 800, ".hero"),
    ("desktop", 1280, 800, ".story-step.critical"),
    ("desktop", 1280, 800, "#survey"),
]


def check_tokens(html: str) -> list[str]:
    block = re.search(r":root\s*\{([^}]*)\}", html)
    found = dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", block.group(1) if block else ""))
    return [f"색 토큰 {k}: 기준 {v} → 현재 {found.get(k, '없음')}"
            for k, v in TOKENS.items() if found.get(k, "").strip().lower() != v]


def shoot(page, sel: str, path: Path) -> None:
    page.evaluate("document.documentElement.style.scrollBehavior='auto'")
    page.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'start'}})")
    page.wait_for_timeout(900)
    page.screenshot(path=str(path))


def diff_ratio(a: Path, b: Path) -> float:
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    if ia.size != ib.size:
        return 1.0
    hist = ImageChops.difference(ia, ib).convert("L").histogram()
    return sum(hist[25:]) / (ia.width * ia.height)


def main() -> int:
    update = "--update" in sys.argv
    target = BASE if update else OUT
    target.mkdir(exist_ok=True)
    problems = check_tokens(PAGE.read_text(encoding="utf-8"))

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for kind, w, h, sel in VIEWS:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            page.goto(PAGE.as_uri())
            page.wait_for_timeout(600)
            if kind == "mobile":
                sw = page.evaluate("document.documentElement.scrollWidth")
                if sw > w:
                    problems.append(f"모바일 가로 넘침: {sw}px")
            name = f"{kind}-{sel.strip('.#').replace('.', '-')}.png"
            shoot(page, sel, target / name)
            page.close()
            if not update:
                base = BASE / name
                if not base.exists():
                    problems.append(f"기준 캡처 없음: {name}")
                    continue
                r = diff_ratio(base, target / name)
                status = "OK" if r < THRESHOLD else "변경됨"
                print(f"{status:5} {name}  {r:.1%}")
                if r >= THRESHOLD:
                    problems.append(f"화면 변경 {name}: {r:.1%} (design-check-out/ 에서 확인)")
        browser.close()

    if update:
        print("기준 캡처를 갱신했습니다.")
        return 0
    for line in problems:
        print("⚠️ ", line)
    print("결과:", "기준과 같음" if not problems else "확인 필요")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
