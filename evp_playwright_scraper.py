import csv
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

# 默认抓取英式英语词表；如需美式英语可改为 "https://englishprofile.org/?menu=evp-online&dict=us"
TARGET_URL = "https://englishprofile.org/?menu=evp-online"
OUTPUT_CSV = Path("evp_c1_c2_vocabulary.csv")
TARGET_LEVELS = ["C1", "C2"]

HEADLESS = True
PAGE_DELAY = 0.8


def dismiss_cookies_if_present(page):
    """关闭可能遮挡元素的 Cookie 弹窗"""
    for text in ["Accept", "Accept all", "I agree", "OK", "Close"]:
        btn = page.locator(
            f'button:has-text("{text}"), a:has-text("{text}"), [class*="clickable"]:has-text("{text}")'
        ).first
        try:
            if btn.count() > 0 and btn.is_visible():
                btn.click(timeout=1500)
                page.wait_for_timeout(400)
                break
        except Exception:
            pass


def get_results_banner(page):
    """读取页面上的 'Results: 1 - 20 of 6217' 状态文本"""
    return page.evaluate(
        """() => {
            const m = document.body.innerText.match(/Results:\\s*\\d+\\s*-\\s*\\d+\\s*of\\s*\\d+/i);
            return m ? m[0].replace(/\\s+/g, ' ') : '';
        }"""
    )


def select_levels_and_search(page):
    """勾选 C1 / C2 筛选条件并提交 Search"""
    before_banner = get_results_banner(page)

    for level in TARGET_LEVELS:
        cb = page.get_by_label(level, exact=True).first
        if cb.count() > 0:
            cb.scroll_into_view_if_needed()
            if not cb.is_checked():
                cb.click(force=True)
            print(f"  - {level} 复选框状态: {'已勾选' if cb.is_checked() else '未勾选'}")
            continue

        lbl = page.locator("label, span, button, a, div").filter(
            has_text=re.compile(rf"^{level}$")
        ).first
        if lbl.count() > 0:
            lbl.scroll_into_view_if_needed()
            lbl.click(force=True)
            print(f"  - 已点击 {level} 筛选标签")

    page.wait_for_timeout(400)

    clear_btn = page.get_by_text("Clear Results", exact=True).first
    search_clicked = False

    if clear_btn.count() > 0:
        for xpath_up in ["xpath=..", "xpath=../..", "xpath=../../..", "xpath=../../../.."]:
            container = clear_btn.locator(xpath_up)
            btn = container.locator(
                'button, input[type="submit"], input[type="button"], a, [class*="clickable"]'
            ).filter(has_text=re.compile(r"^Search$", re.I)).first

            if btn.count() == 0:
                btn = container.locator('input[value="Search" i]').first

            if btn.count() > 0 and btn.is_visible():
                btn.scroll_into_view_if_needed()
                btn.click()
                search_clicked = True
                break

    if not search_clicked:
        fallback_btn = page.locator(
            'button:has-text("Search"), input[value="Search" i], a:has-text("Search"), [class*="clickable"]:has-text("Search")'
        ).first
        if fallback_btn.count() > 0:
            fallback_btn.click()
            search_clicked = True

    print(f"  - Search 按钮触发状态: {'已点击' if search_clicked else '未找到'}")

    for _ in range(25):
        page.wait_for_timeout(400)
        now_banner = get_results_banner(page)
        if now_banner and now_banner != before_banner:
            break

    # Display 是 <select>（5/10/15/20/25/30/50/100）：选 100，把 311 页降到 63 页
    cur_banner = get_results_banner(page)
    try:
        page.locator("select").filter(
            has=page.locator("option:text-is('100')")
        ).first.select_option("100", timeout=5000)
        for _ in range(15):
            page.wait_for_timeout(400)
            b = get_results_banner(page)
            if b and b != cur_banner:
                break
    except Exception as e:
        print(f"  - 设置 Display=100 失败，沿用默认每页条数: {e}")

    final_banner = get_results_banner(page)
    print(f"当前筛选状态: {final_banner or '已加载结果列表'}")


def expected_row_count(page):
    """从 'Results: 101 - 200 of 6217' 推算当前页应有的行数"""
    m = re.search(r"Results:\s*(\d+)\s*-\s*(\d+)\s*of", get_results_banner(page), re.I)
    return int(m.group(2)) - int(m.group(1)) + 1 if m else 0


def count_rendered_rows(page):
    return page.evaluate(
        """() => {
            const hdr = Array.from(document.querySelectorAll('*')).find(
                el => el.children.length === 0 && (el.innerText || '').trim() === 'Base Word'
            );
            if (!hdr) return 0;
            const top = hdr.getBoundingClientRect().top;
            const rgs = Array.from(document.querySelectorAll('.RepeatingGroup'))
                .filter(rg => { const r = rg.getBoundingClientRect(); return r.width > 200 && r.height > 40 && r.top >= top - 10; })
                .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
            if (!rgs.length) return 0;
            return Array.from(rgs[0].querySelectorAll('.group-item')).filter(i => i.closest('.RepeatingGroup') === rgs[0]).length;
        }"""
    )


def scroll_to_render_all_rows(page, expected):
    """Bubble 的 RepeatingGroup 是懒加载的：分步滚动到底，直到渲染出的行数达到预期"""
    for _ in range(4):
        y = 0
        height = page.evaluate("document.body.scrollHeight")
        while y < height + 1000:
            page.evaluate("y => window.scrollTo(0, y)", y)
            page.wait_for_timeout(200)
            y += 500
            height = page.evaluate("document.body.scrollHeight")
        if count_rendered_rows(page) >= expected:
            break
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(300)



def extract_current_page_rows(page):
    """提取当前页 RepeatingGroup 中的全部词条行"""
    expected = expected_row_count(page)
    scroll_to_render_all_rows(page, expected)

    raw_items = page.evaluate(
        """() => {
            const headerNames = ['Base Word', 'Guideword', 'Level', 'Part of Speech', 'Topic'];

            const baseHeaders = Array.from(document.querySelectorAll('*')).filter(el => {
                if (el.children.length > 0) return false;
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && (el.innerText || '').trim() === 'Base Word';
            });
            if (baseHeaders.length === 0) return [];

            const baseHeader = baseHeaders[0];
            const baseRect = baseHeader.getBoundingClientRect();

            const headers = [];
            for (const name of headerNames) {
                const match = Array.from(document.querySelectorAll('*')).find(el => {
                    if (el.children.length > 0) return false;
                    const r = el.getBoundingClientRect();
                    return (
                        r.width > 0 &&
                        r.height > 0 &&
                        (el.innerText || '').trim() === name &&
                        Math.abs(r.top - baseRect.top) < 40
                    );
                });
                if (match) {
                    const r = match.getBoundingClientRect();
                    headers.push({
                        name,
                        left: r.left,
                        right: r.right,
                        centerX: r.left + r.width / 2,
                    });
                }
            }
            if (headers.length < 3) return [];

            headers.sort((a, b) => a.left - b.left);
            for (let i = 0; i < headers.length; i++) {
                headers[i].boundLeft = i === 0 ? headers[i].left - 60 : (headers[i - 1].centerX + headers[i].centerX) / 2;
                headers[i].boundRight = i === headers.length - 1 ? headers[i].right + 160 : (headers[i].centerX + headers[i + 1].centerX) / 2;
            }

            const minX = headers[0].boundLeft;
            const maxX = headers[headers.length - 1].boundRight;

            const rgs = Array.from(document.querySelectorAll('.RepeatingGroup')).filter(rg => {
                const r = rg.getBoundingClientRect();
                return r.width > 200 && r.height > 40 && r.top >= baseRect.top - 10;
            });
            if (rgs.length === 0) return [];

            rgs.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
            const mainRg = rgs[0];

            const groupItems = Array.from(mainRg.querySelectorAll('.group-item')).filter(
                item => item.closest('.RepeatingGroup') === mainRg
            );
            groupItems.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

            const results = [];
            for (const rowEl of groupItems) {
                const rowData = {
                    'Base Word': '',
                    'Guideword': '',
                    'Level': '',
                    'Part of Speech': '',
                    'Topic': '',
                };

                // 不限制标签名，提取行内所有最底层可见文本元素
                const cells = Array.from(rowEl.querySelectorAll('*')).filter(el => {
                    if (el.children.length > 0) return false;
                    const txt = (el.innerText || '').trim();
                    if (!txt) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.left >= minX && r.left <= maxX;
                });

                cells.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

                for (const cell of cells) {
                    const txt = (cell.innerText || '').trim();
                    const r = cell.getBoundingClientRect();
                    const cx = r.left + r.width / 2;

                    const matchedHeader = headers.find(h => cx >= h.boundLeft && cx < h.boundRight);
                    if (matchedHeader) {
                        const col = matchedHeader.name;
                        rowData[col] = rowData[col] ? `${rowData[col]} ${txt}` : txt;
                    }
                }

                const linkEl = rowEl.querySelector('a[href]');
                const href = linkEl ? linkEl.href : '';

                if (rowData['Base Word']) {
                    results.push({
                        baseWord: rowData['Base Word'],
                        guideword: rowData['Guideword'],
                        level: rowData['Level'].toUpperCase(),
                        pos: rowData['Part of Speech'],
                        topic: rowData['Topic'],
                        href,
                    });
                }
            }

            return results;
        }"""
    )

    rows = []
    for item in raw_items:
        lv = item["level"]
        if lv and lv not in TARGET_LEVELS:
            continue
        rows.append([
            item["baseWord"],
            item["guideword"],
            lv,
            item["pos"],
            item["topic"],
            item["href"],
        ])

    return rows


def go_to_next_page(page, current_page_num):
    """点击 "Page: x / y" 同一行的 › 按钮翻页（工具栏是 « ‹ … › » 四个无文字图标按钮）"""
    before_banner = get_results_banner(page)

    m = re.search(r"Results:\s*\d+\s*-\s*(\d+)\s*of\s*(\d+)", before_banner, re.I)
    if m and int(m.group(1)) >= int(m.group(2)):
        return False

    target = page.evaluate(
        """() => {
            const label = Array.from(document.querySelectorAll('*')).find(
                el => el.children.length === 0 && /^Page:\\s*\\d+\\s*\\/\\s*\\d+/.test((el.innerText || '').trim())
            );
            if (!label) return null;
            label.scrollIntoView({ block: 'center' });
            const y = label.getBoundingClientRect().top;
            const btns = Array.from(document.querySelectorAll('button'))
                .filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && Math.abs(r.top - y) < 30;
                })
                .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
            if (btns.length < 4) return null;
            // « ‹ [Page: x / y] › »  ->  倒数第二个是 "下一页"
            const r = btns[btns.length - 2].getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }"""
    )

    if not target:
        print("[翻页诊断] 未找到 'Page: x / y' 所在行的翻页按钮")
        return False

    page.mouse.click(target["x"], target["y"])

    for _ in range(25):
        page.wait_for_timeout(400)
        now_banner = get_results_banner(page)
        if now_banner and now_banner != before_banner:
            return True

    return False



def main():
    total_saved = 0
    page_num = 1
    seen_page_signatures = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/130.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        print(f"正在打开 EVP 页面: {TARGET_URL}")
        page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(2000)

        dismiss_cookies_if_present(page)

        print(f"正在筛选等级: {', '.join(TARGET_LEVELS)} ...")
        select_levels_and_search(page)

        with OUTPUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(
                ["Base Word", "Guideword", "Level", "Part of Speech", "Topic", "Detail URL"]
            )

            while True:
                rows = extract_current_page_rows(page)

                if not rows:
                    print(f"[第 {page_num} 页] 未检测到数据行，抓取结束。")
                    break

                page_sig = tuple(tuple(r[:4]) for r in rows[:3])
                if page_sig in seen_page_signatures:
                    print("检测到重复页内容，已到达最后一页。")
                    break
                seen_page_signatures.add(page_sig)

                writer.writerows(rows)
                f.flush()
                total_saved += len(rows)
                banner = get_results_banner(page)
                print(f"[第 {page_num} 页] 写入 {len(rows)} 条 | 累计: {total_saved} 条 ({banner})")
                exp = expected_row_count(page)
                if exp and len(rows) != exp:
                    print(f"  ! 警告：本页预期 {exp} 条，实际提取 {len(rows)} 条")

                time.sleep(PAGE_DELAY)

                if not go_to_next_page(page, page_num):
                    print("已翻至最后一页，抓取完成。")
                    break

                page_num += 1

        browser.close()

    print(f"\n全部完成！共保存 {total_saved} 条 C1/C2 词条至: {OUTPUT_CSV.resolve()}")


if __name__ == "__main__":
    main()