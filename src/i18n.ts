export type SupportedLocale = "en" | "ko";

export interface Translations {
  viewTitle: string;
  ribbonOpen: string;
  commandOpenView: string;
  commandFocusActiveNote: string;
  noticeViewOpenFailed: string;
  viewHint: string;
  statusOpenMarkdownFirst: string;
  statusActiveNoteExcluded: string;
  searchAriaLabel: string;
  searchPlaceholder: string;
  toolbarActive: string;
  toolbarActiveTitle: string;
  toolbarFit: string;
  toolbarFitTitle: string;
  toolbarRotate: string;
  toolbarRotateTitle: string;
  nodeConnections: (count: number, folder: string) => string;
  searchResults: (matches: number, highlightedStars: number) => string;
  linkCount: (rendered: number, total?: number) => string;
  graphStatus: (stars: number, links: string) => string;
  settingsIntro: string;
  autoRotateName: string;
  autoRotateDescription: string;
  rotationSpeedName: string;
  rotationSpeedDescription: string;
  starScaleName: string;
  starScaleDescription: string;
  glowStrengthName: string;
  glowStrengthDescription: string;
  linkOpacityName: string;
  linkOpacityDescription: string;
  maxLinksName: string;
  maxLinksDescription: string;
  backgroundName: string;
  backgroundDescription: string;
  showOrphansName: string;
  showOrphansDescription: string;
  excludedFoldersName: string;
  excludedFoldersDescription: string;
  excludedFoldersPlaceholder: string;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

function englishNumber(value: number): string {
  return value.toLocaleString("en");
}

function koreanNumber(value: number): string {
  return value.toLocaleString("ko");
}

const ENGLISH: Translations = {
  viewTitle: "Galaxy Graph",
  ribbonOpen: "Open Galaxy Graph",
  commandOpenView: "Open view",
  commandFocusActiveNote: "Focus active note",
  noticeViewOpenFailed: "Galaxy Graph view could not be opened.",
  viewHint: "Drag to rotate · Right-drag to pan · Scroll to zoom",
  statusOpenMarkdownFirst: "Open a Markdown note first",
  statusActiveNoteExcluded: "The active note is not included in the current galaxy filter",
  searchAriaLabel: "Search notes in the galaxy",
  searchPlaceholder: "Search notes…",
  toolbarActive: "Active",
  toolbarActiveTitle: "View the active note's neighborhood",
  toolbarFit: "Fit",
  toolbarFitTitle: "Fit the entire galaxy on screen",
  toolbarRotate: "Rotate",
  toolbarRotateTitle: "Toggle auto-rotation",
  nodeConnections: (count, folder) =>
    `${englishNumber(count)} ${plural(count, "connection", "connections")} · ${folder}`,
  searchResults: (matches, highlightedStars) =>
    `${englishNumber(matches)} ${plural(matches, "result", "results")} · ${englishNumber(highlightedStars)} ${plural(highlightedStars, "star", "stars")} including neighbors`,
  linkCount: (rendered, total) => total === undefined
    ? `${englishNumber(rendered)} ${plural(rendered, "link", "links")}`
    : `${englishNumber(rendered)} / ${englishNumber(total)} links`,
  graphStatus: (stars, links) =>
    `${englishNumber(stars)} ${plural(stars, "star", "stars")} · ${links}`,
  settingsIntro: "Tune the galaxy without changing Obsidian's built-in Graph view.",
  autoRotateName: "Auto-rotate",
  autoRotateDescription: "Slowly rotate the camera while the galaxy is idle.",
  rotationSpeedName: "Rotation speed",
  rotationSpeedDescription: "Camera rotation speed while auto-rotate is enabled.",
  starScaleName: "Star scale",
  starScaleDescription: "Scale star cores and their translucent halos.",
  glowStrengthName: "Glow strength",
  glowStrengthDescription: "Bloom intensity around stars and bright links.",
  linkOpacityName: "Link opacity",
  linkOpacityDescription: "Opacity of the lines connecting linked notes.",
  maxLinksName: "Maximum rendered links",
  maxLinksDescription: "Caps 3D links in very large vaults. Strong links and broad node coverage are kept first.",
  backgroundName: "Background",
  backgroundDescription: "Deep-space background color in CSS hex format.",
  showOrphansName: "Show unlinked notes",
  showOrphansDescription: "Include notes with no incoming or outgoing resolved links.",
  excludedFoldersName: "Excluded folders",
  excludedFoldersDescription: "Comma-separated vault-relative folder paths. Their descendants are also excluded.",
  excludedFoldersPlaceholder: "Templates, Archive/Private"
};

const KOREAN: Translations = {
  viewTitle: "은하 그래프",
  ribbonOpen: "은하 그래프 열기",
  commandOpenView: "뷰 열기",
  commandFocusActiveNote: "활성 노트에 초점 맞추기",
  noticeViewOpenFailed: "은하 그래프 뷰를 열 수 없습니다.",
  viewHint: "드래그 회전 · 우클릭 드래그 이동 · 스크롤 확대",
  statusOpenMarkdownFirst: "먼저 마크다운 노트를 열어 주세요",
  statusActiveNoteExcluded: "활성 노트가 현재 은하 필터에 포함되지 않습니다",
  searchAriaLabel: "은하에서 노트 검색",
  searchPlaceholder: "노트 검색…",
  toolbarActive: "활성",
  toolbarActiveTitle: "활성 노트 주변 보기",
  toolbarFit: "맞춤",
  toolbarFitTitle: "전체 은하를 화면에 맞추기",
  toolbarRotate: "회전",
  toolbarRotateTitle: "자동 회전 켜기/끄기",
  nodeConnections: (count, folder) => `연결 ${koreanNumber(count)}개 · ${folder}`,
  searchResults: (matches, highlightedStars) =>
    `검색 결과 ${koreanNumber(matches)}개 · 이웃 포함 별 ${koreanNumber(highlightedStars)}개`,
  linkCount: (rendered, total) => total === undefined
    ? `연결 ${koreanNumber(rendered)}개`
    : `연결 ${koreanNumber(rendered)} / ${koreanNumber(total)}개`,
  graphStatus: (stars, links) => `별 ${koreanNumber(stars)}개 · ${links}`,
  settingsIntro: "Obsidian의 기본 그래프 뷰를 변경하지 않고 은하 그래프를 조정합니다.",
  autoRotateName: "자동 회전",
  autoRotateDescription: "은하가 유휴 상태일 때 카메라를 천천히 회전합니다.",
  rotationSpeedName: "회전 속도",
  rotationSpeedDescription: "자동 회전이 켜져 있을 때의 카메라 회전 속도입니다.",
  starScaleName: "별 크기",
  starScaleDescription: "별의 중심과 반투명한 후광 크기를 조정합니다.",
  glowStrengthName: "광채 강도",
  glowStrengthDescription: "별과 밝은 연결선 주변의 블룸 강도를 조정합니다.",
  linkOpacityName: "연결선 불투명도",
  linkOpacityDescription: "연결된 노트 사이 선의 불투명도를 조정합니다.",
  maxLinksName: "최대 렌더링 연결 수",
  maxLinksDescription: "매우 큰 볼트에서 3D 연결 수를 제한합니다. 강한 연결과 넓은 노드 범위를 우선 유지합니다.",
  backgroundName: "배경",
  backgroundDescription: "CSS 16진수 형식의 우주 배경 색상입니다.",
  showOrphansName: "연결 없는 노트 표시",
  showOrphansDescription: "들어오거나 나가는 확인된 연결이 없는 노트도 포함합니다.",
  excludedFoldersName: "제외할 폴더",
  excludedFoldersDescription: "쉼표로 구분한 볼트 기준 폴더 경로입니다. 하위 폴더도 함께 제외됩니다.",
  excludedFoldersPlaceholder: "템플릿, 보관/비공개"
};

export function resolveLocale(language: string): SupportedLocale {
  const normalized = language.trim().toLocaleLowerCase().replaceAll("_", "-");
  return normalized === "ko" || normalized.startsWith("ko-") ? "ko" : "en";
}

export function translationsFor(language: string): Translations {
  return resolveLocale(language) === "ko" ? KOREAN : ENGLISH;
}
