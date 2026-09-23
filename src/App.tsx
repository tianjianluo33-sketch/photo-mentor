import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Focus,
  Grid3X3,
  History,
  ImagePlus,
  Lightbulb,
  MoveHorizontal,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import Scene from "./components/Scene";
import {
  APERTURES,
  DEFAULT_SIM,
  ISOS,
  LESSONS,
  SHUTTERS,
  STYLE_CARDS,
  evaluateLesson,
  exposureDelta,
  getDemoGuidance,
  goalLabel,
  type Constraint,
  type DemoGuidanceOptions,
  type Device,
  type FeedbackDepth,
  type Goal,
  type LessonId,
  type SimSettings,
  type StyleId,
} from "./domain";
import {
  EMPTY_STATE,
  STORAGE_KEY,
  parseSavedState,
  preferenceLabel,
  recordComparison,
  recordLesson,
  type CompareRecord,
  type SavedState,
} from "./storage";

const DEFAULT_GUIDANCE: DemoGuidanceOptions = {
  goal: "portrait",
  device: "phone",
  depth: "simple",
  style: "none",
  strategy: "subject",
  constraint: "none",
};
const validPages = [
  "/",
  "/learn",
  "/lesson/motion",
  "/lesson/depth",
  "/lesson/composition",
  "/coach",
  "/styles",
  "/journal",
];
function currentPage() {
  const path = window.location.hash.slice(1) || "/";
  return validPages.includes(path) ? path : "/";
}
function go(path: string) {
  if (window.location.hash.slice(1) !== path) window.location.hash = path;
}
function readSaved(): SavedState {
  try {
    return parseSavedState(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...EMPTY_STATE, lessons: {}, comparisons: [] };
  }
}

function Button({
  children,
  onClick,
  kind = "primary",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`button ${kind} ${className}`}
    >
      {children}
    </button>
  );
}
function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
function SectionHeading({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <Eyebrow>{kicker}</Eyebrow>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; title: string; detail?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className="choices">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={`choice ${value === option.value ? "selected" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <span>{option.title}</span>
            {option.detail && <small>{option.detail}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function App() {
  const [page, setPage] = useState(currentPage);
  const [saved, setSaved] = useState(readSaved);
  const [storageError, setStorageError] = useState(false);
  const [config, setConfig] = useState<DemoGuidanceOptions>(DEFAULT_GUIDANCE);
  const [bridge, setBridge] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const handle = () => {
      setPage(currentPage());
      window.scrollTo({ top: 0, behavior: "instant" });
      main.current?.focus();
    };
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [saved]);
  function enterCoach(style?: StyleId, lesson?: LessonId, goal?: Goal) {
    if (style)
      setConfig((c) => ({
        ...c,
        style,
        goal: style === "environment" ? "environment" : c.goal,
        strategy: style === "environment" ? "context" : c.strategy,
      }));
    if (goal)
      setConfig((c) => ({
        ...c,
        goal,
        strategy: goal === "environment" ? "context" : "subject",
      }));
    if (lesson) setBridge(LESSONS.find((item) => item.id === lesson)!.title);
    go("/coach");
  }
  const active = page.startsWith("/lesson") ? "/learn" : page;
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        跳到正文
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#/" aria-label="取景 FRAME 首页">
            <span className="brand-icon">
              <Focus size={24} />
            </span>
            <strong>
              取景<span>FRAME</span>
            </strong>
          </a>
          <nav aria-label="主导航">
            {[
              ["/", "开始"],
              ["/learn", "互动学习"],
              ["/coach", "现场指导"],
              ["/styles", "方法灵感"],
            ].map(([url, label]) => (
              <a
                key={url}
                href={`#${url}`}
                aria-current={active === url ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            className={`journal-link ${active === "/journal" ? "is-active" : ""}`}
            href="#/journal"
          >
            <History size={17} />
            <span>我的记录</span>
          </a>
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {storageError && (
          <div className="storage-warning" role="status">
            浏览器暂时不能保存记录；你仍可继续体验，本次记录仅保留在页面中。
          </div>
        )}
        {page === "/" && <Home enterCoach={() => enterCoach()} />}
        {page === "/learn" && <Learn saved={saved} />}
        {page.startsWith("/lesson/") && (
          <Lesson
            key={page}
            id={page.split("/")[2] as LessonId}
            onSubmit={(id, passed, hint) =>
              setSaved((s) =>
                recordLesson(s, id, passed, hint, new Date().toISOString()),
              )
            }
            enterCoach={enterCoach}
          />
        )}
        {page === "/coach" && (
          <Coach
            config={config}
            setConfig={setConfig}
            bridge={bridge}
            clearBridge={() => setBridge(null)}
            onSave={(record) => setSaved((s) => recordComparison(s, record))}
          />
        )}
        {page === "/styles" && <Styles enterCoach={enterCoach} />}
        {page === "/journal" && (
          <Journal
            saved={saved}
            clear={() => setSaved({ version: 1, lessons: {}, comparisons: [] })}
          />
        )}
      </main>
      <footer className="site-footer">
        <div>
          <Focus size={16} />
          <span>取景 FRAME</span>
          <span className="footer-note">把下一张，拍得更有想法。</span>
        </div>
        <button onClick={() => setAbout(!about)} aria-expanded={about}>
          关于这个雏形 <CircleHelp size={14} />
        </button>
      </footer>
      {about && (
        <aside className="about-panel">
          <strong>产品体验版 · 0.1</strong>
          <p>
            三节课程采用教学规则与原创示意。现场指导是预设案例，尚未接入真实
            AI；个人图片仅在本机预览。记录保存在当前浏览器，可在“我的记录”删除。
          </p>
          <button aria-label="关闭说明" onClick={() => setAbout(false)}>
            <X size={18} />
          </button>
        </aside>
      )}
    </>
  );
}

function Home({ enterCoach }: { enterCoach: () => void }) {
  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <Eyebrow>
            <span className="status-dot" /> A LITTLE PRACTICE. A NEW
            PERSPECTIVE.
          </Eyebrow>
          <h1>
            学会看见，
            <br />
            再按下快门<span>。</span>
          </h1>
          <p className="hero-description">
            从看懂一束光，到拍好眼前的风景。
            <br />
            让每一次尝试，都有一个清晰的下一步。
          </p>
          <div className="hero-actions">
            <Button onClick={() => go("/learn")}>
              开始互动练习 <ArrowRight size={17} />
            </Button>
            <Button kind="secondary" onClick={enterCoach}>
              <Camera size={17} />
              直接去现场指导
            </Button>
          </div>
          <div className="hero-meta">
            <span>
              <Check size={13} /> 手机 / 相机均可探索
            </span>
            <span>
              <Check size={13} /> 两个入口，自由开始
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="viewfinder">
            <div className="viewfinder-top">
              <span>
                <span className="live-dot" /> FRAME LAB
              </span>
              <span>01 / 03</span>
            </div>
            <Scene mode="hero" variant="after" grid />
            <div className="viewfinder-bottom">
              <span>
                35 <small>mm</small>
              </span>
              <span>f / 4</span>
              <span>1 / 125</span>
              <span>ISO 200</span>
            </div>
            <div className="hero-hint">
              <span>
                <MoveHorizontal size={17} />
              </span>
              <div>
                <strong>试着向左走一步</strong>
                <small>让人物的轮廓，从背景中分开。</small>
              </div>
            </div>
          </div>
          <div className="visual-caption">
            <span>换个角度，故事就不一样。</span>
            <span>原创教学示意 ↗</span>
          </div>
        </div>
      </section>
      <section className="start-section">
        <SectionHeading kicker="YOUR WAY IN" title="从你需要的地方开始">
          <span className="muted section-note">
            无需按顺序，也不用先学完课程。
          </span>
        </SectionHeading>
        <div className="entry-grid">
          <button
            className="entry-card learn-entry"
            onClick={() => go("/learn")}
          >
            <span className="entry-number">01 / LEARN</span>
            <span className="entry-icon">
              <SlidersHorizontal size={26} />
            </span>
            <h3>
              动手调一次，
              <br />
              比看懂更进一步。
            </h3>
            <p>拖动参数，观察变化。用三节轻量练习，理解曝光、景深与构图。</p>
            <div className="entry-bottom">
              <span>
                进入互动学习 <ArrowRight size={17} />
              </span>
              <small>每节 3–4 分钟</small>
            </div>
          </button>
          <button className="entry-card coach-entry" onClick={enterCoach}>
            <span className="entry-number">02 / SHOOT</span>
            <span className="entry-icon">
              <ScanLine size={27} />
            </span>
            <h3>
              眼前的场景，
              <br />
              下一张怎么拍？
            </h3>
            <p>从拍摄意图出发，尝试一个具体动作，再把前后两张放在一起看。</p>
            <div className="entry-bottom">
              <span>
                进入现场指导 <ArrowRight size={17} />
              </span>
              <small>可直接使用 · 示例版</small>
            </div>
          </button>
        </div>
      </section>
      <section className="method-strip">
        <div className="mini-grid">
          <span />
          <span />
          <span />
          <i />
        </div>
        <div>
          <Eyebrow>LESS IMITATION, MORE INTENTION</Eyebrow>
          <h3>借鉴一种观察方法，找到自己的表达。</h3>
          <p>从几何关系、环境叙事和明暗层次开始。</p>
        </div>
        <Button kind="ghost" onClick={() => go("/styles")}>
          看看方法灵感 <ArrowRight size={17} />
        </Button>
      </section>
      <div className="prototype-note">
        <span>体验版说明</span>
        <p>
          当前现场指导展示预设案例；真实照片可本机预览与对比，AI
          分析正在下一阶段计划中。
        </p>
      </div>
    </div>
  );
}

function Learn({ saved }: { saved: SavedState }) {
  return (
    <div className="page">
      <div className="page-intro">
        <Eyebrow>THE PRACTICE ROOM</Eyebrow>
        <h1>把摄影原理，变成你的直觉。</h1>
        <p>先动手，再理解原因。每节都可以单独开始。</p>
      </div>
      <div className="lesson-list">
        {LESSONS.map((lesson) => (
          <a
            key={lesson.id}
            href={`#/lesson/${lesson.id}`}
            className="lesson-card"
          >
            <div className={`lesson-art lesson-art-${lesson.id}`}>
              <Scene
                mode={lesson.id}
                settings={{
                  ...DEFAULT_SIM,
                  apertureIndex: lesson.id === "depth" ? 0 : 2,
                  viewpoint: lesson.id === "composition" ? 1 : 0,
                }}
                grid={lesson.id === "composition"}
              />
              <span>{lesson.number}</span>
            </div>
            <div className="lesson-card-copy">
              <div className="card-meta">
                <span>LESSON {lesson.number}</span>
                <span>
                  <Clock3 size={13} /> 约 {lesson.minutes} 分钟
                </span>
              </div>
              <h2>{lesson.title}</h2>
              <p>{lesson.description}</p>
              <div className="lesson-card-bottom">
                <span>
                  {saved.lessons[lesson.id]?.passed
                    ? "曾达成本题目标"
                    : saved.lessons[lesson.id]
                      ? `已尝试 ${saved.lessons[lesson.id]!.attempts} 次`
                      : "随时开始"}
                </span>
                <span className="round-arrow">
                  <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
      <div className="callout">
        <Lightbulb size={20} />
        <div>
          <strong>这里可以放心试错。</strong>
          <p>
            所有画面都是教学示意。参数改变会带来不同取舍，没有适用于所有照片的唯一答案。
          </p>
        </div>
      </div>
      <div className="next-link">
        <span>已经有拍摄经验？</span>
        <a href="#/coach">
          直接打开现场指导 <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}

function Lesson({
  id,
  onSubmit,
  enterCoach,
}: {
  id: LessonId;
  onSubmit: (id: LessonId, passed: boolean, hint: boolean) => void;
  enterCoach: (style?: StyleId, lesson?: LessonId, goal?: Goal) => void;
}) {
  const lesson = LESSONS.find((item) => item.id === id)!;
  const [sim, setSim] = useState<SimSettings>({ ...DEFAULT_SIM });
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<ReturnType<
    typeof evaluateLesson
  > | null>(null);
  const [grid, setGrid] = useState(id === "composition");
  const delta = exposureDelta(sim);
  function update(key: keyof SimSettings, value: number | string) {
    setSim((s) => ({ ...s, [key]: value }));
    setFeedback(null);
  }
  function submit() {
    const result = evaluateLesson(id, sim);
    setFeedback(result);
    onSubmit(id, result.passed, hint);
  }
  function slider(
    label: string,
    key: "shutterIndex" | "apertureIndex" | "isoIndex",
    max: number,
    value: string,
    ends: string[],
  ) {
    return (
      <label className="slider-field">
        <span>
          {label}
          <strong>{value}</strong>
        </span>
        <input
          type="range"
          min="0"
          max={max}
          step="1"
          value={sim[key]}
          aria-label={label}
          aria-valuetext={value}
          onChange={(e) => update(key, Number(e.target.value))}
        />
        <small>
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </small>
      </label>
    );
  }
  const hints = {
    motion:
      "先试 1/500 秒。保持 f/4，再将 ISO 调到 800，观察相对亮度能否回到 0 EV；之后试着找另一组参数。",
    depth:
      "想突出人物，试 f/2 或 f/2.8；想保留环境，试 f/5.6 或 f/8。本题固定焦距、对焦距离与画幅，亮度会自动补偿。",
    composition:
      "突出人物时试“侧移”：观察头部与立柱。保留环境时试“环境构图”：观察人物在整个场景中的占比。",
  };
  return (
    <div className="page">
      <a className="back-link" href="#/learn">
        <ArrowLeft size={15} /> 全部练习
      </a>
      <div className="lesson-title">
        <div>
          <Eyebrow>LESSON {lesson.number} / INTERACTIVE</Eyebrow>
          <h1>{lesson.title}</h1>
        </div>
        <span className="pill">
          <Clock3 size={13} /> 约 {lesson.minutes} 分钟
        </span>
      </div>
      <div className="workspace-grid">
        <div className="simulation-panel">
          <div className="panel-toolbar">
            <span>
              <span className="status-dot" /> 参数联动示意
            </span>
            <button
              className={grid ? "active" : ""}
              aria-pressed={grid}
              onClick={() => setGrid(!grid)}
            >
              <Grid3X3 size={16} /> 参考线
            </button>
          </div>
          <Scene settings={sim} mode={id} grid={grid} />
          <div className="sim-readouts">
            {id === "motion" ? (
              <>
                <div>
                  <small>相对目标亮度</small>
                  <strong className={Math.abs(delta) < 0.35 ? "positive" : ""}>
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)} <small>EV</small>
                  </strong>
                </div>
                <div>
                  <small>运动表现</small>
                  <strong>
                    {sim.shutterIndex >= 4 ? "拖影减弱" : "可见拖影"}
                  </strong>
                </div>
                <div>
                  <small>ISO 取舍</small>
                  <strong>
                    {sim.isoIndex >= 3 ? "增益 / 噪点增加" : "较低增益"}
                  </strong>
                </div>
              </>
            ) : id === "depth" ? (
              <>
                <div>
                  <small>清晰范围</small>
                  <strong>
                    {sim.apertureIndex <= 1
                      ? "更浅"
                      : sim.apertureIndex >= 3
                        ? "更深"
                        : "中等"}
                  </strong>
                </div>
                <div>
                  <small>亮度</small>
                  <strong>本题自动补偿</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <small>当前视点</small>
                  <strong>
                    {
                      [
                        "正面 · 轮廓重叠",
                        "侧移 · 分离轮廓",
                        "环境构图 · 更多留白",
                      ][sim.viewpoint]
                    }
                  </strong>
                </div>
              </>
            )}
          </div>
          <p className="canvas-caption">
            原创示意 ·{" "}
            {id === "depth"
              ? "固定焦距、对焦距离与画幅，简化景深效果。"
              : id === "motion"
                ? "固定场景亮度；ISO 表示显示增益，不增加进光量。"
                : "三个预设视点，用于比较人物与背景的关系。"}
          </p>
        </div>
        <aside className="control-panel">
          <span className="pill soft">
            <Focus size={13} /> 本题目标
          </span>
          <h2>
            {id === "motion"
              ? "留住动作，也留住亮度。"
              : "先决定，你希望看见什么。"}
          </h2>
          <p className="control-description">{lesson.objective}</p>
          {id !== "motion" && (
            <Choice
              label="表达目标"
              value={sim.depthGoal}
              options={[
                { value: "subject", title: "突出人物" },
                { value: "context", title: "保留环境" },
              ]}
              onChange={(v) => update("depthGoal", v)}
            />
          )}
          {id === "motion" &&
            slider(
              "快门速度",
              "shutterIndex",
              5,
              `1/${SHUTTERS[sim.shutterIndex]} 秒`,
              ["慢 · 更多拖影", "快 · 更少拖影"],
            )}
          {id !== "composition" &&
            slider(
              "光圈",
              "apertureIndex",
              4,
              `f/${APERTURES[sim.apertureIndex]}`,
              ["大光圈", "小光圈"],
            )}
          {id === "motion" &&
            slider("ISO", "isoIndex", 5, String(ISOS[sim.isoIndex]), [
              "低增益",
              "高增益",
            ])}
          {id === "composition" && (
            <Choice
              label="试着换个视点"
              value={String(sim.viewpoint)}
              options={[
                { value: "0", title: "正面" },
                { value: "1", title: "侧移" },
                { value: "2", title: "环境构图" },
              ]}
              onChange={(v) => update("viewpoint", Number(v))}
            />
          )}
          <div className="control-actions">
            <Button onClick={submit}>
              检查这次尝试 <ArrowRight size={16} />
            </Button>
            <div>
              <button
                onClick={() => {
                  setHint(true);
                }}
              >
                <Lightbulb size={15} /> 看一点提示
              </button>
              <button
                onClick={() => {
                  setSim({ ...DEFAULT_SIM });
                  setFeedback(null);
                }}
              >
                <RotateCcw size={14} /> 重置参数
              </button>
            </div>
          </div>
          {hint && (
            <div className="hint-box">
              <strong>观察提示</strong>
              <p>{hints[id]}</p>
              <small>本轮使用过提示，会在记录中如实保留。</small>
            </div>
          )}
          {feedback && (
            <div
              role="status"
              className={`feedback ${feedback.passed ? "success" : ""}`}
            >
              <strong>
                {feedback.passed ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Compass size={18} />
                )}
                {feedback.title}
              </strong>
              <p>{feedback.body}</p>
            </div>
          )}
        </aside>
      </div>
      <div className="lesson-transfer">
        <div>
          <h3>把这个观察，带到真实场景里。</h3>
          <p>你随时可以打开现场指导，也可以继续尝试其他参数。</p>
        </div>
        <Button
          kind="secondary"
          onClick={() =>
            enterCoach(
              undefined,
              id,
              id === "motion"
                ? undefined
                : sim.depthGoal === "context"
                  ? "environment"
                  : "portrait",
            )
          }
        >
          带着目标去拍摄 <Camera size={16} />
        </Button>
      </div>
    </div>
  );
}

type LocalPhoto = { url: string; name: string };
function PhotoInput({
  label,
  photo,
  onChange,
  capture = false,
}: {
  label: string;
  photo: LocalPhoto | null;
  onChange: (photo: LocalPhoto | null) => void;
  capture?: boolean;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );
  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = ++generation.current;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("请选择 JPG、PNG 或 WebP 图片。HEIC 请先导出为 JPG。");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("图片超过 12 MB，请换一张较小的图片。");
      return;
    }
    setLoading(true);
    const url = URL.createObjectURL(file);
    try {
      const preview = new Image();
      preview.src = url;
      await preview.decode();
      if (!mounted.current || request !== generation.current) {
        URL.revokeObjectURL(url);
        return;
      }
      if (preview.naturalWidth * preview.naturalHeight > 40_000_000)
        throw new Error("图片尺寸过大，请缩小到 4000 万像素以内。");
      onChange({ url, name: file.name });
    } catch (reason) {
      URL.revokeObjectURL(url);
      if (mounted.current && request === generation.current)
        setError(
          reason instanceof Error && reason.message.startsWith("图片尺寸")
            ? reason.message
            : "无法读取这张图片，请尝试其他图片。",
        );
    } finally {
      if (mounted.current && request === generation.current) setLoading(false);
    }
  }
  return (
    <div className="photo-input">
      {photo ? (
        <div className="local-photo">
          <img src={photo.url} alt={`${label}：本机图片预览`} />
          <button
            aria-label={`移除${label}`}
            onClick={() => {
              generation.current++;
              setLoading(false);
              onChange(null);
              setError("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="photo-placeholder">
          <ImagePlus size={30} />
          <strong>{label}</strong>
          <span>图片仅在本机预览</span>
        </div>
      )}
      <label className="file-button">
        <ImagePlus size={16} />
        {loading ? "正在读取图片…" : photo ? `更换${label}` : `选择${label}`}
        <input
          type="file"
          aria-label={`选择${label}`}
          accept="image/jpeg,image/png,image/webp"
          capture={capture ? "environment" : undefined}
          onChange={pick}
          disabled={loading}
        />
      </label>
      {photo && <small className="file-name">{photo.name}</small>}
      {error && (
        <p className="input-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Coach({
  config,
  setConfig,
  bridge,
  clearBridge,
  onSave,
}: {
  config: DemoGuidanceOptions;
  setConfig: (c: DemoGuidanceOptions) => void;
  bridge: string | null;
  clearBridge: () => void;
  onSave: (r: CompareRecord) => void;
}) {
  const [source, setSource] = useState<"demo" | "personal">("demo");
  const [stage, setStage] = useState<"setup" | "guidance" | "compare">("setup");
  const [first, setFirst] = useState<LocalPhoto | null>(null);
  const [second, setSecond] = useState<LocalPhoto | null>(null);
  const [preference, setPreference] = useState<
    CompareRecord["preference"] | null
  >(null);
  const [recorded, setRecorded] = useState(false);
  const [grid, setGrid] = useState(false);
  const stageFocus = useRef<HTMLHeadingElement>(null);
  const lastStage = useRef(stage);
  useEffect(() => {
    if (source === "demo" && lastStage.current !== stage) {
      stageFocus.current?.focus({ preventScroll: true });
      stageFocus.current?.scrollIntoView({ block: "nearest" });
    }
    lastStage.current = stage;
  }, [stage, source]);
  function update<K extends keyof DemoGuidanceOptions>(
    key: K,
    value: DemoGuidanceOptions[K],
  ) {
    setConfig({
      ...config,
      [key]: value,
      ...(key === "goal"
        ? {
            strategy:
              value === "environment"
                ? ("context" as const)
                : ("subject" as const),
          }
        : {}),
    });
    setRecorded(false);
    setPreference(null);
  }
  const guidance = getDemoGuidance(config);
  function switchSource(next: "demo" | "personal") {
    if (next === source) return;
    setSource(next);
    setStage("setup");
    setRecorded(false);
    setPreference(null);
    setFirst(null);
    setSecond(null);
  }
  function save() {
    if (!preference || recorded) return;
    onSave({
      id: crypto.randomUUID(),
      source,
      preference,
      goal: goalLabel(config.goal),
      createdAt: new Date().toISOString(),
    });
    setRecorded(true);
  }
  return (
    <div className="page coach-page">
      <div className="page-intro compact">
        <Eyebrow>YOUR NEXT SHOT</Eyebrow>
        <h1>从眼前这一幕，开始。</h1>
        <p>带着一个想法拍，再看下一张发生了什么。</p>
      </div>
      <div className="coach-top">
        <div className="segmented" role="group" aria-label="内容来源">
          <button
            aria-pressed={source === "demo"}
            className={source === "demo" ? "selected" : ""}
            onClick={() => switchSource("demo")}
          >
            <Sparkles size={15} /> 体验示例指导
          </button>
          <button
            aria-pressed={source === "personal"}
            className={source === "personal" ? "selected" : ""}
            onClick={() => switchSource("personal")}
          >
            <ImagePlus size={15} /> 使用我的照片
          </button>
        </div>
        <span className="pill">
          <span className="status-dot" /> 无需先完成课程
        </span>
      </div>
      {bridge && (
        <div className="bridge-note">
          <BookOpen size={17} />
          <span>带入的练习：{bridge}。可自由更改下方目标。</span>
          <button onClick={clearBridge} aria-label="清除练习关联">
            <X size={16} />
          </button>
        </div>
      )}
      <ol className="steps" aria-label="拍摄流程">
        {[
          "确定意图",
          source === "demo" ? "尝试建议" : "选择照片",
          "重拍对比",
        ].map((step, i) => (
          <li
            key={step}
            className={
              (stage === "setup" ? 0 : stage === "guidance" ? 1 : 2) >= i
                ? "current"
                : ""
            }
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {step}
            {i < 2 && <ChevronRight size={15} />}
          </li>
        ))}
      </ol>
      {source === "personal" ? (
        <div className="personal-workspace">
          <div className="callout">
            <ImagePlus size={22} />
            <div>
              <strong>照片属于你，选择也属于你。</strong>
              <p>
                本版支持本机预览与两图对比，暂不分析真实照片。图片不会上传，离开现场指导后不保留。
              </p>
            </div>
          </div>
          <Choice<Goal>
            label="这次希望表达什么？"
            value={config.goal}
            options={[
              { value: "portrait", title: "突出人物" },
              { value: "environment", title: "保留环境" },
              { value: "creative", title: "探索新拍法" },
            ]}
            onChange={(v) => update("goal", v)}
          />
          <div className="personal-pair">
            <PhotoInput
              label="原图"
              photo={first}
              onChange={(p) => {
                setFirst(p);
                setPreference(null);
                setRecorded(false);
                setStage(
                  p && second ? "compare" : p || second ? "guidance" : "setup",
                );
              }}
            />
            <PhotoInput
              label="重拍图"
              capture
              photo={second}
              onChange={(p) => {
                setSecond(p);
                setPreference(null);
                setRecorded(false);
                setStage(
                  p && first ? "compare" : p || first ? "guidance" : "setup",
                );
              }}
            />
          </div>
          <p className="fine-print">
            JPG / PNG / WebP · 单张不超过 12 MB、4000 万像素 ·
            移动端的拍摄选项由系统提供
          </p>
          {first && second ? (
            <Preference
              preference={preference}
              setPreference={(v) => {
                setPreference(v);
                setRecorded(false);
              }}
              recorded={recorded}
              save={save}
            />
          ) : (
            <div className="empty-inline">
              <MoveHorizontal size={18} />{" "}
              选择两张照片后，就可以记录你更喜欢的表达。
            </div>
          )}
        </div>
      ) : (
        <>
          {stage === "setup" && (
            <div className="workspace-grid coach-setup">
              <div className="coach-scene">
                <div className="panel-toolbar">
                  <span>内置练习场景</span>
                  <span className="pill">原创示意</span>
                </div>
                <Scene mode="composition" variant="before" />
                <div className="scene-story">
                  <Eyebrow>THE WINDOW PORTRAIT</Eyebrow>
                  <h3>窗边的人，与身后的线条。</h3>
                  <p>
                    一侧较亮的墙面、窗框、立柱与小桌面。先选一个意图，再尝试调整人物与环境的关系。
                  </p>
                  <span>
                    <Sun size={15} /> 仅用于体验指导流程
                  </span>
                </div>
              </div>
              <aside className="control-panel coach-controls">
                <h2 ref={stageFocus} tabIndex={-1}>
                  你想把它拍成什么样？
                </h2>
                <Choice<Goal>
                  label="拍摄意图"
                  value={config.goal}
                  options={[
                    { value: "portrait", title: "突出人物" },
                    { value: "environment", title: "保留环境" },
                    { value: "creative", title: "探索新拍法" },
                  ]}
                  onChange={(v) => update("goal", v)}
                />
                <Choice<Device>
                  label="你使用的设备"
                  value={config.device}
                  options={[
                    { value: "phone", title: "手机" },
                    { value: "camera", title: "相机" },
                    { value: "unknown", title: "还不确定" },
                  ]}
                  onChange={(v) => update("device", v)}
                />
                <Choice<FeedbackDepth>
                  label="希望得到怎样的引导？"
                  value={config.depth}
                  options={[
                    {
                      value: "simple",
                      title: "告诉我怎么做",
                      detail: "先从一个具体动作开始",
                    },
                    {
                      value: "explore",
                      title: "给我方案与取舍",
                      detail: "比较方向，自己决定",
                    },
                  ]}
                  onChange={(v) => update("depth", v)}
                />
                <label className="select-field">
                  参考一种方法
                  <select
                    value={config.style}
                    onChange={(e) => update("style", e.target.value as StyleId)}
                  >
                    <option value="none">跟随我的拍摄意图</option>
                    {STYLE_CARDS.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Button onClick={() => setStage("guidance")}>
                  看看下一张怎么拍 <ArrowRight size={17} />
                </Button>
                <p className="fine-print">
                  示例建议来自预设教学规则，尚未接入真实 AI。
                </p>
              </aside>
            </div>
          )}
          {stage === "guidance" && (
            <div className="guidance-layout">
              <div className="guidance-scene">
                <Scene mode="composition" variant="before" grid />
                <div className="scene-story">
                  <span className="pill soft">{goalLabel(config.goal)}</span>
                  <h3>一次先改变一个因素。</h3>
                  <p>
                    先试动作，再检查结果。现场条件有变化时，可以换一种做法。
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setStage("setup")}
                  >
                    <SlidersHorizontal size={15} /> 修改目标与设备
                  </button>
                </div>
              </div>
              <div className="guidance-content">
                <div className="section-heading small">
                  <div>
                    <Eyebrow>DEMO GUIDANCE</Eyebrow>
                    <h2 ref={stageFocus} tabIndex={-1}>
                      {guidance.title}
                    </h2>
                  </div>
                </div>
                {config.depth === "explore" && (
                  <Choice
                    label="选择探索方向"
                    value={config.strategy}
                    options={[
                      { value: "subject", title: "人物成为重点" },
                      { value: "context", title: "环境参与表达" },
                    ]}
                    onChange={(v) => update("strategy", v)}
                  />
                )}
                <Choice<Constraint>
                  label="现场有什么限制？"
                  value={config.constraint}
                  options={[
                    { value: "none", title: "可以自由调整" },
                    { value: "camera", title: "机位不能动" },
                    { value: "subject", title: "人物不能动" },
                  ]}
                  onChange={(v) => update("constraint", v)}
                />
                <div className="action-cards">
                  {guidance.actions.map((action, i) => (
                    <article key={action.id} className="action-card">
                      <span className="action-number">0{i + 1}</span>
                      <div>
                        <h3>{action.title}</h3>
                        <p>{action.body}</p>
                        {config.depth === "explore" ? (
                          <div className="action-explanation">
                            <p>
                              <strong>为什么</strong>
                              {action.reason}
                            </p>
                            <p>
                              <strong>取舍</strong>
                              {action.tradeoff}
                            </p>
                          </div>
                        ) : (
                          <details>
                            <summary>为什么这样做？</summary>
                            <p>{action.reason}</p>
                            <p>取舍：{action.tradeoff}</p>
                          </details>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <p className="device-note">
                  <Camera size={17} />
                  {guidance.deviceNote}
                </p>
                <Button
                  onClick={() => {
                    setStage("compare");
                    setRecorded(false);
                    setPreference(null);
                  }}
                >
                  查看示例重拍对比 <MoveHorizontal size={17} />
                </Button>
              </div>
            </div>
          )}
          {stage === "compare" && (
            <div className="comparison-workspace">
              <div className="comparison-heading">
                <div>
                  <Eyebrow>LOOK AGAIN</Eyebrow>
                  <h2 ref={stageFocus} tabIndex={-1}>
                    你更喜欢哪一种表达？
                  </h2>
                  <p>
                    当前意图：{goalLabel(config.goal)}。新版本也可以有它的取舍。
                  </p>
                </div>
                <button
                  className={`grid-toggle ${grid ? "active" : ""}`}
                  onClick={() => setGrid(!grid)}
                  aria-pressed={grid}
                >
                  <Grid3X3 size={16} /> 参考线
                </button>
              </div>
              <div className="compare-pair">
                <figure>
                  <Scene mode="composition" variant="before" grid={grid} />
                  <figcaption>
                    <strong>A · 原始示意</strong>
                    <span>人物与立柱重叠，保留较多背景。</span>
                  </figcaption>
                </figure>
                <figure>
                  <Scene
                    mode="composition"
                    variant={
                      config.strategy === "context" ? "context" : "after"
                    }
                    grid={grid}
                  />
                  <figcaption>
                    <strong>B · 另一种取景示意</strong>
                    <span>
                      {config.strategy === "context"
                        ? "人物占比变小，更多环境参与画面。"
                        : "人物与立柱分开，画面关系改变。"}
                    </span>
                  </figcaption>
                </figure>
              </div>
              <p className="fine-print">
                这里比较的是两种预设构图，不是 AI
                重拍结果，也不模拟全部动作与光线变化。
              </p>
              <Preference
                preference={preference}
                setPreference={(v) => {
                  setPreference(v);
                  setRecorded(false);
                }}
                recorded={recorded}
                save={save}
              />
              <div className="comparison-actions">
                <Button kind="ghost" onClick={() => setStage("guidance")}>
                  <ArrowLeft size={16} /> 回到指导建议
                </Button>
                <Button
                  kind="secondary"
                  onClick={() => switchSource("personal")}
                >
                  换成自己的照片 <ImagePlus size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Preference({
  preference,
  setPreference,
  recorded,
  save,
}: {
  preference: CompareRecord["preference"] | null;
  setPreference: (p: CompareRecord["preference"]) => void;
  recorded: boolean;
  save: () => void;
}) {
  return (
    <div className="preference-panel">
      <Choice
        label="根据你的拍摄意图，记录一个判断"
        value={preference ?? ""}
        options={[
          { value: "before", title: "更喜欢原图 A" },
          { value: "after", title: "更喜欢新图 B" },
          { value: "both", title: "各有表达" },
          { value: "unsure", title: "暂时不确定" },
        ]}
        onChange={(v) => setPreference(v as CompareRecord["preference"])}
      />
      <div className="preference-bottom">
        <span aria-live="polite">
          {recorded
            ? "已记录在本机；这代表你的偏好，不是自动评分。"
            : "审美可以有不同答案，保留你的判断。"}
        </span>
        <Button disabled={!preference || recorded} onClick={save}>
          {recorded ? (
            <>
              <CheckCircle2 size={16} /> 已保存判断
            </>
          ) : (
            <>
              保存这个判断 <Check size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Styles({ enterCoach }: { enterCoach: (style?: StyleId) => void }) {
  const symbols = [Grid3X3, Compass, Sun];
  return (
    <div className="page">
      <div className="page-intro">
        <Eyebrow>WAYS OF SEEING</Eyebrow>
        <h1>从一种方法，走向自己的表达。</h1>
        <p>
          借鉴观察方式，带着问题拍摄。这些原创教学卡，可以随时用在练习和现场。
        </p>
      </div>
      <div className="style-grid">
        {STYLE_CARDS.map((card, i) => {
          const Icon = symbols[i];
          return (
            <article key={card.id} className="style-card">
              <div className={`style-illustration style-${card.id}`}>
                <Icon size={64} strokeWidth={0.8} />
                <span>STUDY / 0{i + 1}</span>
                <i />
                <i />
              </div>
              <div className="style-copy">
                <Eyebrow>METHOD 0{i + 1}</Eyebrow>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
                <div className="style-principle">
                  <strong>观察线索</strong>
                  <p>{card.principle}</p>
                  <strong>也要考虑</strong>
                  <p>{card.tradeoff}</p>
                </div>
                <Button onClick={() => enterCoach(card.id)}>
                  带到现场指导 <ArrowRight size={15} />
                </Button>
                <Button
                  kind="ghost"
                  onClick={() => go(`/lesson/${card.lessonId}`)}
                >
                  从相关练习开始 <BookOpen size={15} />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="fine-print">
        这里展示通用摄影方法与原创示意，尚未建立名师作品授权库，也不模拟某位摄影师本人。
      </p>
    </div>
  );
}

function Journal({ saved, clear }: { saved: SavedState; clear: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const lessons = Object.values(saved.lessons).filter(Boolean);
  const total = lessons.reduce((sum, r) => sum + r!.attempts, 0);
  return (
    <div className="page">
      <div className="page-intro">
        <Eyebrow>YOUR CONTACT SHEET</Eyebrow>
        <h1>留住每一次尝试。</h1>
        <p>记录你做过的练习和作出的判断，慢慢找到自己的拍摄习惯。</p>
      </div>
      <div className="stats-row">
        <div>
          <strong>{total.toString().padStart(2, "0")}</strong>
          <span>实际提交次数</span>
        </div>
        <div>
          <strong>
            {lessons
              .filter((r) => r!.passed)
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span>曾达标的练习</span>
        </div>
        <div>
          <strong>
            {saved.comparisons.length.toString().padStart(2, "0")}
          </strong>
          <span>保存的对比判断</span>
        </div>
      </div>
      <SectionHeading kicker="PRACTICE LOG" title="互动练习" />
      <div className="journal-lessons">
        {LESSONS.map((lesson) => {
          const record = saved.lessons[lesson.id];
          return (
            <div key={lesson.id}>
              <span className="journal-number">{lesson.number}</span>
              <div>
                <h3>{lesson.title}</h3>
                <p>
                  {record
                    ? `已提交 ${record.attempts} 次 · ${record.passed ? "曾达成本题目标" : "继续尝试中"} · ${record.usedHint ? "曾使用提示" : "未使用提示"}`
                    : "还没有提交记录，随时可以开始。"}
                </p>
              </div>
              <a href={`#/lesson/${lesson.id}`}>
                {record ? "再试一次" : "开始练习"}
                <ArrowRight size={16} />
              </a>
            </div>
          );
        })}
      </div>
      <p className="fine-print">
        提交、达标和独立掌握是不同状态。此处不会仅凭完成一次练习判断你已掌握。
      </p>
      <SectionHeading kicker="REFLECTIONS" title="重拍与判断">
        <span className="muted">最近 20 条 · 本机保存</span>
      </SectionHeading>
      {saved.comparisons.length ? (
        <div className="comparison-log">
          {saved.comparisons.map((record) => (
            <article key={record.id}>
              <div className="log-icon">
                <MoveHorizontal size={20} />
              </div>
              <div>
                <h3>{preferenceLabel(record.preference)}</h3>
                <p>
                  {record.goal} ·{" "}
                  {record.source === "demo" ? "预设示例" : "个人图片"} ·{" "}
                  {new Date(record.createdAt).toLocaleString("zh-CN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span className="pill">个人判断</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="journal-empty">
          <History size={28} />
          <h3>从第一组对比开始。</h3>
          <p>你保存的判断会出现在这里，照片本身不会保存。</p>
          <Button kind="secondary" onClick={() => go("/coach")}>
            打开现场指导 <ArrowRight size={16} />
          </Button>
        </div>
      )}
      <div className="local-data">
        <div>
          <strong>只属于当前浏览器的记录</strong>
          <p>没有账号或云同步。清除浏览器数据或删除记录后，无法恢复。</p>
        </div>
        {confirm ? (
          <div className="delete-confirm">
            <span>确认清除全部练习和判断？</span>
            <button
              onClick={() => {
                clear();
                setConfirm(false);
              }}
            >
              确认清除
            </button>
            <button onClick={() => setConfirm(false)}>取消</button>
          </div>
        ) : (
          <button
            disabled={!total && !saved.comparisons.length}
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={15} /> 清除本机记录
          </button>
        )}
      </div>
    </div>
  );
}
