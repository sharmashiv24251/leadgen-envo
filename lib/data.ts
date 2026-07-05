export interface DashboardStats {
  emailsDelivered: number;
  bounceRatePct: number;
  replyRatePct: number;
  totalDrafted: number;
}

export type ActivityTone = "success" | "info" | "warning";

export interface ActivityEvent {
  id: string;
  timeAgo: string;
  description: string;
  tone: ActivityTone;
}

export type ProspectStatus =
  | "DRAFTED"
  | "SENT"
  | "DELIVERED"
  | "BOUNCED"
  | "RESPONDED";

export interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  emailVerified: boolean;
  /** Days before today this email was drafted. 0 = today, 1 = yesterday. */
  daysAgo: number;
  subject: string;
  body: string;
  intel: string[];
  status: ProspectStatus;
  isDemo: boolean;
  response?: string;
}

/** Computes the actual calendar date `daysAgo` days back from whenever this runs. */
export function dateGroupLabel(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const dashboardStats: DashboardStats = {
  emailsDelivered: 4812,
  bounceRatePct: 1.8,
  replyRatePct: 9.4,
  totalDrafted: 5214,
};

export const activityFeed: ActivityEvent[] = [
  {
    id: "act-1",
    timeAgo: "just now",
    description: "Reply from D. Castellano — Vantage Health Group",
    tone: "success",
  },
  {
    id: "act-2",
    timeAgo: "6m ago",
    description: "Email delivered — R. Okafor, Brightline Systems",
    tone: "info",
  },
  {
    id: "act-3",
    timeAgo: "19m ago",
    description: "Reply from L. Marsh — Northfield Logistics",
    tone: "success",
  },
  {
    id: "act-4",
    timeAgo: "34m ago",
    description: "Bounce detected, redraft queued — K. Yun, Pierpoint Robotics",
    tone: "warning",
  },
  {
    id: "act-5",
    timeAgo: "52m ago",
    description: "Email delivered — A. Desrosiers, Halcyon Biotech",
    tone: "info",
  },
];

export const prospects: Prospect[] = [
  {
    id: "brenna-shields",
    name: "Brenna Shields",
    title: "VP of People Operations",
    company: "Neurent Medical",
    location: "Austin, TX",
    email: "brenna.shields@neurentmedical.com",
    emailVerified: true,
    daysAgo: 1,
    subject: "Neurent's headcount data + a hiring bottleneck we noticed",
    body: `Hi Brenna,

Congrats on the Series B — noticed your People team's grown from two to five in the last quarter, and you've still got three open Generalist reqs sitting unfilled for a few weeks now.

That pattern (fast headcount growth, no HRIS integration on the careers page) usually means onboarding is running on spreadsheets and tribal knowledge right around now, which tends to show up first as offer-acceptance drop-off.

We built thehrcompany's onboarding layer specifically for teams in that exact window — live in about two weeks, no rip-and-replace of your current stack.

Worth 15 minutes this week to see if it'd help Neurent specifically?

Sana Whitfield
thehrcompany`,
    intel: [
      "Closed a $38M Series B in April; People team grew from 2 → 5 in one quarter.",
      "3 open \"HR Generalist\" reqs posted 3+ weeks ago — still unfilled.",
      "Careers page shows a manual onboarding checklist, no HRIS integration mentioned.",
    ],
    status: "DELIVERED",
    isDemo: true,
  },
  {
    id: "jonah-omeara",
    name: "Jonah O'Meara",
    title: "Head of Talent Acquisition",
    company: "Calloway Analytics",
    location: "Denver, CO",
    email: "j.omeara@callowayanalytics.io",
    emailVerified: false,
    daysAgo: 1,
    subject: "Calloway's time-to-fill vs. the market",
    body: `Hi Jonah,

Saw a few of Calloway's roles have been reposted twice on LinkedIn, and a couple of recent Glassdoor reviews mention five-plus interview stages — usually a sign candidates are dropping mid-process rather than a sourcing problem.

We looked at time-to-fill data across a dozen companies your size last quarter; the ones that cut to three stages or fewer filled roles about 40% faster, with no drop in quality-of-hire.

thehrcompany's scheduling and stage-automation layer can trim that without touching your actual interview criteria — just the friction around it.

Happy to walk through the comparison specific to Calloway if useful.

Sana Whitfield
thehrcompany`,
    intel: [
      "14 open reqs on LinkedIn, several reposted twice in the last month.",
      "Recent Glassdoor reviews cite 5+ interview stages as a common complaint.",
      "No structured interview-stage automation found in current stack.",
    ],
    status: "DELIVERED",
    isDemo: true,
  },
  {
    id: "priya-anand",
    name: "Priya Anand",
    title: "Director of HR",
    company: "Fernhill Robotics",
    location: "Seattle, WA",
    email: "priya.anand@fernhillrobotics.com",
    emailVerified: true,
    daysAgo: 1,
    subject: "Building Fernhill's first People function without the busywork",
    body: `Hi Priya,

Saw your post on scaling culture past 100 people — and that Fernhill's hiring its first dedicated People Partner to build the function from scratch. That's a specific, hard moment: everything from offer letters to onboarding to policy usually still lives in someone's head.

thehrcompany is built for exactly that gap — a People stack you can stand up in days, not the six-month platform rollout that usually eats a first year in the role.

Given where Fernhill is right now, might be useful to see what the first 90 days could look like with it in place.

Open to a quick look this week?

Sana Whitfield
thehrcompany`,
    intel: [
      "Posted on LinkedIn two weeks ago about \"scaling culture past 100 people.\"",
      "Fernhill is hiring its first dedicated \"Senior People Partner\" — building HR from zero.",
      "140 employees, no HR system of record identified yet.",
    ],
    status: "RESPONDED",
    isDemo: true,
    response: `Hi Sana,

Good timing — this is exactly the gap I've been trying to solve for since I started. Can you send over what the first 90 days would actually look like? Free Thursday afternoon if you want to walk through it live.

Priya`,
  },
  {
    id: "marcus-webb",
    name: "Marcus Webb",
    title: "VP Talent Acquisition",
    company: "Ridgeline Freight",
    location: "Chicago, IL",
    email: "marcus.webb@ridgelinefreight.com",
    emailVerified: false,
    daysAgo: 1,
    subject: "Ridgeline's driver retention math",
    body: `Hi Marcus,

Ridgeline's Q2 call flagged driver retention as a top-three priority, and a handful of recent Indeed reviews point at onboarding paperwork delays as a recurring complaint — those two usually sit on the same line item once you trace it back.

We've seen carriers your size cut new-driver onboarding time by roughly a third just by digitizing the paperwork and background-check handoffs, which shows up directly in 90-day retention.

thehrcompany's onboarding flow was built around exactly that handoff — happy to share the retention numbers from a comparable fleet.

Worth 15 minutes to see if the math holds for Ridgeline?

Sana Whitfield
thehrcompany`,
    intel: [
      "Q2 earnings call named driver retention a top-3 company priority.",
      "Recent Indeed reviews cite onboarding paperwork delays as a recurring complaint.",
      "No digital onboarding flow found for driver hires.",
    ],
    status: "DELIVERED",
    isDemo: true,
  },
  {
    id: "talia-freeman",
    name: "Talia Freeman",
    title: "Chief People Officer",
    company: "Bramwell & Co",
    location: "Boston, MA",
    email: "tfreeman@bramwellco.com",
    emailVerified: true,
    daysAgo: 1,
    subject: "Doing more with a flat HR headcount — a data point for Bramwell",
    body: `Hi Talia,

Saw your comment in the trade press about doing more with a flat HR headcount this year, and Bramwell's return-to-office announcement last month — that combination usually means your team's fielding a lot more one-off exception requests without any extra bandwidth to handle them.

thehrcompany's policy and exceptions layer is built to absorb exactly that kind of load, so requests get routed and resolved without every one landing on your desk personally.

Given the timing, thought it might be worth a look — happy to keep it to 15 minutes.

Sana Whitfield
thehrcompany`,
    intel: [
      "Announced a return-to-office policy last month — exception requests likely up.",
      "Quoted in a trade article on \"doing more with a flat HR headcount in 2026.\"",
      "Bramwell & Co, ~600 employees, single generalist HR team handling all requests.",
    ],
    status: "BOUNCED",
    isDemo: true,
  },
  {
    id: "upender-singh",
    name: "Upender Singh",
    title: "Director & Co-Founder",
    company: "Visiting Angels NI (P&U Healthcare Solutions Ltd)",
    location: "Belfast, Northern Ireland",
    email: "upender.singh@visiting-angels.co.uk",
    emailVerified: false,
    daysAgo: 0,
    subject: "200 new jobs is exciting — who's handling the HR side?",
    body: `Hi Upender,

Saw the news about Visiting Angels bringing 200 jobs and five new offices to Belfast — brilliant momentum for a service this new. Scaling that fast in care is exciting but it's also exactly when things go wrong on the HR side, because everyone's heads-down on hiring carers, not on process.

There was a case earlier this year, a nurse at a Sheffield care home won over £23k after a disciplinary process only interviewed white staff and ignored video evidence clearing her. Not malice, just no proper process in place. That's the kind of thing that's easy to avoid and expensive to fix after the fact.

We help care providers like yours put contracts, disciplinary process and compliance in place without needing a full-time HR hire yet. Worth a 15-min call to see if it's useful for where you're at?

Sean`,
    intel: [
      "Adding 200 jobs and 5 new offices across Belfast/Bangor/Newtownabbey — Belfast News Letter, 9 Feb 2026.",
      "Sub-50 employee, early-stage scale-up (launched Feb 2026, Companies House NI724599) — no accounts filed yet.",
      "Comparable: nurse won £23,603 after a disciplinary process only interviewed white staff and ignored video evidence clearing her (Beatrice Mbonda v Quarryfields Health Care Ltd, Jan 2026).",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
  {
    id: "shane-connolly",
    name: "Shane Connolly",
    title: "Founder & MD",
    company: "Roco (Roco9 Ltd)",
    location: "Crossmaglen, Co. Armagh",
    email: "shane.connolly@roco9.com",
    emailVerified: false,
    daysAgo: 0,
    subject: "Doubling headcount at Roco, quick one on the HR side",
    body: `Hi Shane,

Saw the news on the £2.5m factory investment and doubling your headcount off the back of that £8m in export sales, huge stuff for a Crossmaglen business. Going from 30 to 60 people is a completely different HR reality though, especially in manufacturing where absence, OH reports and disciplinary process actually matter.

There was a UK tribunal case this year, a plastics manufacturer got hit for £30k after HR mishandled a warehouse worker's disability and sick leave, secret filming, cancelled income protection, no proper OH follow-up. Not malicious, just no solid process behind it. Easy to avoid if someone's actually looking after that side.

We help manufacturers like Roco get contracts, absence management and disciplinary process sorted without hiring a full-time HR person yet. Worth a quick 15-min call?

Sean`,
    intel: [
      "Headcount doubling from ~30 to ~60 on the back of £8m export sales, £2.5m factory investment, £210k Invest NI support — Invest NI, 17 June 2026.",
      "No HR/People role listed on the company's \"Meet The Team\" page.",
      "Comparable: manufacturer hit for £30,682 after mishandling a warehouse worker's disability and sick leave — covert filming, cancelled income protection, no OH follow-up (Mr N Wilson v Aliaxis UK Ltd).",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
  {
    id: "andrew-jones",
    name: "Andrew Jones",
    title: "Managing Director",
    company: "S Jones Containers",
    location: "Aldridge, UK",
    email: "andrew.jones@sjonescontainers.co.uk",
    emailVerified: false,
    daysAgo: 0,
    subject: "reviews from the workshop team",
    body: `Hi Andrew,

I noticed some recent reviews on Indeed from your operational staff mentioning frustrations with management style and the culture in the workshop. When team feedback starts spilling onto public boards, it usually points to an HR gap that is getting hard to manage internally.

We saw this play out recently in the Callum Harris v. Complex Logistics Ltd employment tribunal case over wage deductions, where operational oversights led to costly public rulings.

At The HR Company, we step in to handle employee relations and compliance for manufacturing and logistics firms so you do not have to worry about grievances escalating to tribunals.

Would you be open to a quick chat next week to see how we could support your management team?

Best,
Niall`,
    intel: [
      "Recent Indeed reviews from operational staff cite frustrations with management style, pay rates, and a \"cliquey or difficult\" workplace culture in the workshop.",
      "~50 employees, no dedicated HR function identified.",
      "Comparable: Callum Harris v. Complex Logistics Ltd (2026) — tribunal penalized unlawful wage deductions for a multi-drop delivery driver.",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
  {
    id: "jeremy-lamb",
    name: "Jeremy Lamb",
    title: "Managing Director",
    company: "EirEng Consulting Engineers",
    location: "Dublin, IE & UK",
    email: "jeremy.lamb@eireng.com",
    emailVerified: false,
    daysAgo: 0,
    subject: "the new Bath office",
    body: `Hi Jeremy,

Congratulations on setting up the new EirEng office in Bath. Expanding into the UK brings a lot of momentum, but navigating a completely different set of employment laws and compliance standards can be a massive headache without a dedicated HR lead.

Missteps in cross border HR can be very expensive. We recently saw a case with DAR Manufacturing Ltd facing a costly employment tribunal over wage deductions simply due to operational compliance oversights.

We help Irish engineering firms scale into the UK by taking the entire HR compliance burden off your plate, ensuring your team is fully covered under UK employment law.

Are you free for a quick call next Thursday to discuss how we can de-risk your expansion?

Best,
Niall`,
    intel: [
      "Recently opened a new UK entity and office in Bath — cross-border expansion into a new employment law jurisdiction.",
      "~40 employees.",
      "Comparable: Mr C Redmond v. DAR Manufacturing Ltd (2025/2026) — tribunal decision on unlawful deduction from wages due to poor compliance oversight.",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
  {
    id: "mohammed-hussain",
    name: "Mohammed Shahed Hussain",
    title: "Director",
    company: "Stirling Castle Construction Limited",
    location: "Hounslow, UK",
    email: "mohammed.hussain@stirlingcastleconstruction.co.uk",
    emailVerified: false,
    daysAgo: 0,
    subject: "the Office Manager role",
    body: `Hi Mohammed,

I saw you are currently hiring an Office Manager in Hounslow. Construction firms often try to patch the HR gap by rolling those responsibilities into an office management role, but expecting one person to handle both operations and employment compliance is incredibly risky.

A recent 2026 employment tribunal case involving Palmers Patisserie resulted in serious penalties just for failing to provide proper written employment particulars to staff.

We partner with construction businesses to handle contracts, compliance, and employee relations properly, removing the risk of tribunal claims so your office team can actually focus on running the business.

Would you be open to a brief call next week to see if this model makes sense for Stirling Castle?

Best,
Niall`,
    intel: [
      "Advertising for a full-time Office Manager to handle general office operations and admin — no dedicated HR role.",
      "~30-40 employees (SME).",
      "Comparable: G Dobrovolskyte v. Palmers Patisserie Manufacturing Ltd (2026) — tribunal on breach of contract and failure to provide written employment particulars.",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
  {
    id: "james-gilbert",
    name: "James Gilbert",
    title: "Managing Director",
    company: "G B Hydraulics Ltd",
    location: "Thatcham, UK",
    email: "james.gilbert@gbhydraulics.com",
    emailVerified: false,
    daysAgo: 0,
    subject: "patching the HR gap",
    body: `Hi James,

I noticed G B Hydraulics is looking for an Office Manager to run your day to day administration. Handing complex HR issues to an administrative hire is a common move for growing engineering firms, but it leaves you highly exposed on the compliance front.

We just saw the 2026 Callum Harris v. Complex Logistics tribunal case result in a severe penalty over simple wage deduction errors that an experienced HR team would have caught.

At The HR Company, we act as your dedicated HR department. We take on the compliance and employee relations risk directly, which is far safer and more cost effective than relying on an office manager.

Do you have ten minutes next Tuesday for a quick chat about this?

Best,
Niall`,
    intel: [
      "Advertising for an Office Manager to oversee day-to-day office housekeeping and admin — HR gap being patched informally.",
      "~30+ employees.",
      "Comparable: Callum Harris v. Complex Logistics Ltd (2026) — tribunal penalized unlawful wage deductions.",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
  {
    id: "william-duenas",
    name: "William Jay Duenas",
    title: "Director",
    company: "Satoshi Solutions Ltd",
    location: "Addlestone, UK",
    email: "william.duenas@satoshisolutions.co.uk",
    emailVerified: false,
    daysAgo: 0,
    subject: "HR compliance at Satoshi Solutions",
    body: `Hi William,

I saw you are hiring an Office Manager to coordinate your hospitality services. It is tempting to roll HR duties into a broad operational role, but managing employee relations and compliance requires specialist focus that an office manager rarely has.

A recent 2026 tribunal case involving Palmers Patisserie led to heavy penalties over simple holiday pay and contract breaches. These are exactly the kinds of oversights that happen when HR is patched together informally.

The HR Company completely removes this risk. We step in to manage your employment compliance and staff relations, letting your team focus entirely on delivering exceptional hospitality.

Are you open to a very brief call next Wednesday to see if we are a fit?

Best,
Niall`,
    intel: [
      "Advertising for an Office Manager to coordinate services and champion hospitality standards — no dedicated HR function.",
      "~30-50 employees.",
      "Comparable: G Dobrovolskyte v. Palmers Patisserie Manufacturing Ltd (2026) — tribunal on failure to provide employment particulars, breach of contract, and holiday pay disputes.",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
  {
    id: "maurice-ryan",
    name: "Maurice Ryan",
    title: "Managing Director",
    company: "P J Edwards & Co",
    location: "Dublin, IE & UK",
    email: "maurice.ryan@pjedwards.ie",
    emailVerified: false,
    daysAgo: 0,
    subject: "expanding into Milton Keynes",
    body: `Hi Maurice,

Great to see P J Edwards setting up the new UK base in Milton Keynes. Expanding across the water is a huge step, but managing a cross border workforce without a dedicated HR director usually leads to critical compliance blind spots.

The recent employment tribunal involving DAR Manufacturing Ltd showed exactly how costly simple wage deduction oversights can be under strict UK employment laws.

We help Irish construction firms manage their UK operations by acting as your fully outsourced HR department, ensuring you remain entirely compliant and protected from tribunal risks as you scale.

Would you be open to a quick call next week to discuss how we can support the new office?

Best,
Niall`,
    intel: [
      "Recently opened a new UK entity and office base in Milton Keynes — cross-border expansion.",
      "~40-60 employees.",
      "Comparable: Mr C Redmond v. DAR Manufacturing Ltd (2025/2026) — tribunal on unlawful deduction from wages under UK employment law.",
    ],
    status: "DRAFTED",
    isDemo: false,
  },
];
