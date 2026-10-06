const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, PageBreak,
  LevelFormat, convertInchesToTwip } = require("docx");

const NAVY = "1F2937";
const ACCENT = "2563EB";
const LIGHT = "EFF6FF";
const GREY = "6B7280";

function h(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
  });
}
function cell(text, opts = {}) {
  const { bold = false, shade = null, width, color = "000000", size = 18 } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold, color, size })],
    })],
  });
}
function row(cells) {
  return new TableRow({ children: cells });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function hr() {
  return new Paragraph({
    border: { bottom: { color: "CBD5E1", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 200 },
  });
}

const colWidths5 = [1600, 2400, 3200, 3200, 2000];

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 260 } } } }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 } } },
    children: [
      new Paragraph({ text: "SDE + AI/ML + ML ENGINEER", heading: HeadingLevel.TITLE, spacing: { after: 60 } }),
      new Paragraph({ text: "Combined 12-Month Roadmap — Realistic Version", heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p("Track: B.Tech CS (AI/ML), 3rd Year  |  Window: 12 months, starting July 2026", { color: GREY, size: 20 }),
      p("Merges and updates your SDE Career Blueprint + Day-to-Day Timetable into one plan covering SDE, AI/ML, and ML Engineer prep together.", { color: GREY, size: 20 }),
      hr(),

      h("The Honest Recalibration", HeadingLevel.HEADING_1),
      p("Your real capacity is ~1.5 hrs/day (~10-12 hrs/week) — not the ~22-24 hrs/week the earlier timetable assumed. That number alone was ambitious for SDE prep by itself. Adding AI/ML + ML Engineer on top, at the same intensity, roughly doubles the syllabus without doubling the hours."),
      p("Three honest consequences, stated up front:", { bold: true }),
      bullet("Your 12-month DSA count target drops from ~400+ to a realistic ~180-220 problems — still enough for service companies and a real shot at product companies, not Amazon/Google-tier volume."),
      bullet("ML Engineer readiness in 12 months at this pace gets you to \"strong junior / can defend a real ML project\" — not \"ML Engineer job-ready at a top company.\" That's realistically an 18-24 month track, same as Google/Microsoft was for pure SDE."),
      bullet("The two tracks share a real backbone (DSA, Python, math, Git) — so this isn't 2x the work, more like 1.5x. That's the whole design of Phase 0 below."),
      p("This isn't a reason to abandon either track — it's why the plan below starts common and only splits once the shared foundation is solid, and why Months 1-3 deliberately add zero SDE-only or ML-only content."),

      pageBreak(),
      h("How the Three Tracks Relate", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          row([cell("Phase", { bold: true, shade: NAVY, color: "FFFFFF", width: 2200 }),
                cell("What's happening", { bold: true, shade: NAVY, color: "FFFFFF", width: 6800 })]),
          row([cell("Months 1-3", { bold: true, shade: LIGHT, width: 2200 }),
                cell("100% common. DSA fundamentals, Python fluency, Git, and math foundations (linear algebra + stats) that both SDE interviews and every ML role need. No SDE-only or ML-only content yet.", { width: 6800 })]),
          row([cell("Months 4-9", { bold: true, shade: LIGHT, width: 2200 }),
                cell("DSA stays common (both tracks need it for interviews). Everything else splits: roughly 60% SDE-track time, 40% AI/ML + ML Engineer time, on top of shared DSA. Split ratio is a starting point — adjust it once you know which track is pulling harder.", { width: 6800 })]),
          row([cell("Months 10-12", { bold: true, shade: LIGHT, width: 2200 }),
                cell("Maintenance DSA + mock interviews for both tracks in parallel. Resume/GitHub/LinkedIn built for whichever track has the stronger story by then — likely ML Engineer, since that's your actual target role.", { width: 6800 })]),
        ],
      }),
      p(""),
      p("Why DSA stays common the whole way through: ML Engineer interviews at real companies (Amazon, Microsoft, most product companies with ML teams) still test DSA in early rounds before any ML-specific round. It's not \"SDE work you're doing instead of ML prep\" — it's a genuine shared requirement.", { italics: true, color: GREY }),

      pageBreak(),
      h("Weekly Timetable (updated for ~1.5 hrs/day)", HeadingLevel.HEADING_1),
      p("Built around ~10-12 hrs/week total: six ~1.5 hr weekday slots + one longer Sunday block. Shift the whole block earlier if your college day ends sooner — the sequence matters more than the exact clock time."),
      new Table({
        width: { size: 9200, type: WidthType.DXA },
        rows: [
          row([cell("Day", { bold: true, shade: NAVY, color: "FFFFFF", width: 1400 }),
                cell("~1.5 hr slot", { bold: true, shade: NAVY, color: "FFFFFF", width: 3800 }),
                cell("Why", { bold: true, shade: NAVY, color: "FFFFFF", width: 4000 })]),
          row([cell("Mon", { bold: true, width: 1400 }), cell("DSA (common backbone)", { width: 3800 }), cell("Attempt 20-25 min before looking at a solution — same rule as before.", { width: 4000 })]),
          row([cell("Tue", { width: 1400 }), cell("SDE fundamentals: OS/DBMS/CN/OOP (rotate)", { width: 3800 }), cell("Pure understanding, no grinding — fastest-closing gap.", { width: 4000 })]),
          row([cell("Wed", { bold: true, width: 1400 }), cell("DSA (common backbone)", { width: 3800 }), cell("Second DSA rep of the week.", { width: 4000 })]),
          row([cell("Thu", { width: 1400 }), cell("ML foundations: math (linear algebra/stats) or NumPy/Pandas/scikit-learn", { width: 3800 }), cell("This is the slot that was missing before — dedicated ML-track time.", { width: 4000 })]),
          row([cell("Fri", { bold: true, width: 1400 }), cell("DSA (common backbone)", { width: 3800 }), cell("Third DSA rep — this is what keeps the shared backbone solid.", { width: 4000 })]),
          row([cell("Sat", { width: 1400 }), cell("Project work — alternate weeks between SDE project and ML project", { width: 3800 }), cell("Don't run both every week; alternating keeps each project moving.", { width: 4000 })]),
          row([cell("Sun (~2.5-3 hrs)", { bold: true, width: 1400 }), cell("Split block: ~1 hr harder DSA + ~1-1.5 hr ML deep work (math/project) + week review", { width: 3800 }), cell("Your only slot long enough for something that needs uninterrupted focus.", { width: 4000 })]),
        ],
      }),
      p(""),
      p("Revision rule (unchanged): every 2 weeks, swap one weekday DSA slot for re-solving 5 old problems cold instead of new ones."),
      p("Non-negotiables: sleep by 11:30 PM · no AI-generated code or ML pipeline you can't explain line-by-line · don't start a new project until the current one is deployed/understood."),

      pageBreak(),
      h("Phase 0 — Common Foundation (Months 1-3)", HeadingLevel.HEADING_1),
      p("Everything here serves both tracks equally. This is the highest-leverage phase in the whole plan — skipping or rushing it is the single biggest way this 12 months goes sideways."),
      new Table({
        width: { size: 9200, type: WidthType.DXA },
        rows: [
          row([cell("Area", { bold: true, shade: NAVY, color: "FFFFFF", width: 2200 }),
                cell("Covers", { bold: true, shade: NAVY, color: "FFFFFF", width: 7000 })]),
          row([cell("DSA", { bold: true, shade: LIGHT, width: 2200 }),
                cell("Arrays, Strings, Hashing, Two Pointers, Sliding Window, recursion (~60-70 problems at this pace).", { width: 7000 })]),
          row([cell("Python for ML", { bold: true, shade: LIGHT, width: 2200 }),
                cell("NumPy (vectorized ops, broadcasting), Pandas (dataframes, groupby, merge), matplotlib basics — the toolkit every ML step after this needs.", { width: 7000 })]),
          row([cell("Math foundation", { bold: true, shade: LIGHT, width: 2200 }),
                cell("Linear algebra: vectors, matrices, dot product, matrix multiplication (what they mean, not just mechanics). Probability & stats: mean/variance, distributions, conditional probability, Bayes' theorem basics. This is the recurring gap that makes ML feel like magic if skipped.", { width: 7000 })]),
          row([cell("Git", { bold: true, shade: LIGHT, width: 2200 }),
                cell("Branching, committing properly, .gitignore — same as before, applies to every project in both tracks.", { width: 7000 })]),
          row([cell("Milestone", { bold: true, shade: LIGHT, width: 2200 }),
                cell("End of Month 3: 60-70 DSA problems re-solvable cold, comfortable writing a NumPy/Pandas data-cleaning script from scratch, can explain matrix multiplication and Bayes' theorem in plain English.", { width: 7000 })]),
        ],
      }),

      pageBreak(),
      h("Months 4-9 — SDE Track (~60% split time)", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 9200, type: WidthType.DXA },
        rows: [
          row([cell("Month", { bold: true, shade: NAVY, color: "FFFFFF", width: 1200 }),
                cell("DSA (shared)", { bold: true, shade: NAVY, color: "FFFFFF", width: 3000 }),
                cell("SDE-specific", { bold: true, shade: NAVY, color: "FFFFFF", width: 3400 }),
                cell("Milestone", { bold: true, shade: NAVY, color: "FFFFFF", width: 1600 })]),
          row([cell("4-5", { bold: true, width: 1200 }), cell("Linked Lists, Stacks, Queues, Binary Search", { width: 3000 }), cell("OOP (Java) + Git deep. Rebuild one existing project's auth flow by hand, no AI.", { width: 3400 }), cell("Explain that project fully to a stranger.", { width: 1600 })]),
          row([cell("6", { bold: true, width: 1200 }), cell("Trees / BST basics", { width: 3000 }), cell("DBMS (joins, normalization, indexes). Deploy one small project end-to-end.", { width: 3400 }), cell("One live deployed URL.", { width: 1600 })]),
          row([cell("7-8", { bold: true, width: 1200 }), cell("Heaps, intro Graphs BFS/DFS", { width: 3000 }), cell("OS + CN basics. Start light internship applications (10-15/month).", { width: 3400 }), cell("Applications going out.", { width: 1600 })]),
          row([cell("9", { bold: true, width: 1200 }), cell("Backtracking, 1D DP intro", { width: 3000 }), cell("LLD basics on paper (parking lot / rate limiter style). Resume draft v1.", { width: 3400 }), cell("One LLD problem talked through end-to-end.", { width: 1600 })]),
        ],
      }),

      pageBreak(),
      h("Months 4-9 — AI/ML + ML Engineer Track (~40% split time)", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 9200, type: WidthType.DXA },
        rows: [
          row([cell("Month", { bold: true, shade: NAVY, color: "FFFFFF", width: 1200 }),
                cell("Core ML", { bold: true, shade: NAVY, color: "FFFFFF", width: 3400 }),
                cell("Applied / Project", { bold: true, shade: NAVY, color: "FFFFFF", width: 3000 }),
                cell("Milestone", { bold: true, shade: NAVY, color: "FFFFFF", width: 1600 })]),
          row([cell("4-5", { bold: true, width: 1200 }), cell("Supervised learning: linear/logistic regression, train/test split, overfitting, bias-variance — with scikit-learn.", { width: 3400 }), cell("First project: a Kaggle-style tabular dataset, regression or classification, done and explained end-to-end.", { width: 3000 }), cell("Can explain bias-variance without notes.", { width: 1600 })]),
          row([cell("6", { bold: true, width: 1200 }), cell("Decision trees, random forests, gradient boosting (XGBoost), evaluation metrics (precision/recall/F1/ROC-AUC).", { width: 3400 }), cell("Improve project 1 with a boosted model and proper metric reporting.", { width: 3000 }), cell("Can justify a metric choice for a given problem.", { width: 1600 })]),
          row([cell("7-8", { bold: true, width: 1200 }), cell("Neural network basics: forward/backprop intuition, PyTorch fundamentals (tensors, autograd, a training loop from scratch).", { width: 3400 }), cell("Second project: a small deep learning task (image classification on a small dataset, or basic NLP).", { width: 3000 }), cell("A training loop written without copying a tutorial.", { width: 1600 })]),
          row([cell("9", { bold: true, width: 1200 }), cell("LLM APIs (OpenAI/Anthropic/HF) + light intro to embeddings and vector search.", { width: 3400 }), cell("Third project: one small RAG app — high resume value, low time cost.", { width: 3000 }), cell("RAG project deployed or demo-able.", { width: 1600 })]),
        ],
      }),

      pageBreak(),
      h("Months 10-12 — Convergence & Interview Readiness", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 9200, type: WidthType.DXA },
        rows: [
          row([cell("Area", { bold: true, shade: NAVY, color: "FFFFFF", width: 2400 }),
                cell("What happens", { bold: true, shade: NAVY, color: "FFFFFF", width: 6800 })]),
          row([cell("DSA", { bold: true, shade: LIGHT, width: 2400 }), cell("Maintenance: 2-3 problems/day, mixed topics, weak-area revisits. ~180-220 cumulative by end.", { width: 6800 })]),
          row([cell("Mock interviews", { bold: true, shade: LIGHT, width: 2400 }), cell("1-2/week from Month 10, mixing DSA rounds and ML-concept rounds (explain a project, discuss a metric choice, whiteboard a model pipeline).", { width: 6800 })]),
          row([cell("Resume / GitHub / LinkedIn", { bold: true, shade: LIGHT, width: 2400 }), cell("Two flagship stories ready: one SDE project (deployed, defensible), one ML project (RAG or the deep learning project) — pick whichever track you want to lead with on applications.", { width: 6800 })]),
          row([cell("Applications", { bold: true, shade: LIGHT, width: 2400 }), cell("Apply broadly across both SDE and ML/Data roles at this stage — let response rates tell you which door is actually opening, rather than guessing now.", { width: 6800 })]),
        ],
      }),
      p(""),
      p("By Month 12, realistic outcome: interview-ready for service/mid-tier product companies on the SDE side, and able to credibly discuss and defend 2-3 ML projects for junior ML/Data roles or ML-adjacent SDE roles. Genuine ML Engineer-title readiness at strong companies is the honest 18-24 month mark — same shape as the Google/Microsoft timeline in your original blueprint.", { italics: true }),

      pageBreak(),
      h("Quarterly Checklist", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 9200, type: WidthType.DXA },
        rows: [
          row([cell("Quarter", { bold: true, shade: NAVY, color: "FFFFFF", width: 2000 }),
                cell("Target", { bold: true, shade: NAVY, color: "FFFFFF", width: 7200 })]),
          row([cell("Q1 (M1-3)", { bold: true, shade: LIGHT, width: 2000 }), cell("60-70 DSA problems, NumPy/Pandas comfortable, linear algebra + stats foundations solid.", { width: 7200 })]),
          row([cell("Q2 (M4-6)", { bold: true, shade: LIGHT, width: 2000 }), cell("~110-130 DSA, one SDE project deployed, first ML project (classical ML) done and explainable.", { width: 7200 })]),
          row([cell("Q3 (M7-9)", { bold: true, shade: LIGHT, width: 2000 }), cell("~160-180 DSA, LLD basics + internship apps started, deep learning project + RAG project done.", { width: 7200 })]),
          row([cell("Q4 (M10-12)", { bold: true, shade: LIGHT, width: 2000 }), cell("Interview-ready on both tracks, resume/GitHub/LinkedIn polished, applications out broadly.", { width: 7200 })]),
        ],
      }),
      p(""),
      p("Weekly: DSA problems solved / target · fundamentals or ML topic covered · project hours logged · 1 old problem re-solved cold · Sunday review done.", { color: GREY }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  require("fs").writeFileSync("/home/claude/SDE_AIML_MLE_Roadmap.docx", buf);
  console.log("done");
});