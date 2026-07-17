export interface DashboardStats {
  emailsDelivered: number;
  bounceRatePct: number;
  replyRatePct: number;
  totalDrafted: number;
  /** EWMA-smoothed reading of `runs.icp_health` (0-10 scale) as a 0-100 percentage. */
  icpHealthPct?: number | null;
  /** `icp_health_note` from the most recent run — the "why" behind the score. */
  icpHealthNote?: string | null;
}

export type ActivityTone = "success" | "info" | "warning";

export interface ActivityEvent {
  id: string;
  timeAgo: string;
  description: string;
  tone: ActivityTone;
  prospectId: string;
}

export type ProspectStatus =
  | "DRAFTED"
  | "SENDING"
  | "DELIVERED"
  | "BOUNCED"
  | "RESPONDED";

export type FollowUpStatus = "draft" | "approved" | "sending" | "sent" | "failed";

export interface FollowUp {
  id: string;
  subject: string;
  body: string;
  status: FollowUpStatus;
}

export interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  /** Days before today this email was drafted. 0 = today, 1 = yesterday. */
  daysAgo: number;
  subject: string;
  body: string;
  intel: string[];
  status: ProspectStatus;
  response?: string;
  /** Present only when a follow-up draft exists and no reply has come in yet (moot once
   * they've replied) -- see fetchWorkenvoData for the merge logic. */
  followUp?: FollowUp;
}

/** Computes the actual calendar date `daysAgo` days back from whenever this runs. */
export function dateGroupLabel(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const activityFeed: ActivityEvent[] = [
  {
    id: "act-1",
    timeAgo: "just now",
    description: "Reply from Priya Anand — Fernhill Robotics",
    tone: "success",
    prospectId: "priya-anand",
  },
  {
    id: "act-2",
    timeAgo: "6m ago",
    description: "Email delivered — Brenna Shields, Neurent Medical",
    tone: "info",
    prospectId: "brenna-shields",
  },
  {
    id: "act-3",
    timeAgo: "19m ago",
    description: "Email delivered — Jonah O'Meara, Calloway Analytics",
    tone: "info",
    prospectId: "jonah-omeara",
  },
  {
    id: "act-4",
    timeAgo: "34m ago",
    description: "Bounce detected — Talia Freeman, Bramwell & Co",
    tone: "warning",
    prospectId: "talia-freeman",
  },
  {
    id: "act-5",
    timeAgo: "52m ago",
    description: "Email delivered — Marcus Webb, Ridgeline Freight",
    tone: "info",
    prospectId: "marcus-webb",
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
    phone: "+1 (512) 555-0148",
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
  },
  {
    id: "jonah-omeara",
    name: "Jonah O'Meara",
    title: "Head of Talent Acquisition",
    company: "Calloway Analytics",
    location: "Denver, CO",
    email: "j.omeara@callowayanalytics.io",
    emailVerified: false,
    phone: "+1 (303) 555-0173",
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
  },
  {
    id: "priya-anand",
    name: "Priya Anand",
    title: "Director of HR",
    company: "Fernhill Robotics",
    location: "Seattle, WA",
    email: "priya.anand@fernhillrobotics.com",
    emailVerified: true,
    phone: "+1 (206) 555-0129",
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
    phone: "+1 (312) 555-0184",
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
  },
  {
    id: "talia-freeman",
    name: "Talia Freeman",
    title: "Chief People Officer",
    company: "Bramwell & Co",
    location: "Boston, MA",
    email: "tfreeman@bramwellco.com",
    emailVerified: true,
    phone: "+1 (617) 555-0157",
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
  },
  {
    id: "upender-singh",
    name: "Upender Singh",
    title: "Director & Co-Founder",
    company: "Visiting Angels NI (P&U Healthcare Solutions Ltd)",
    location: "Belfast, Northern Ireland",
    email: "upender.singh@visiting-angels.co.uk",
    emailVerified: true,
    phone: "+44 7700 900456",
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
  },
  {
    id: "shane-connolly",
    name: "Shane Connolly",
    title: "Founder & MD",
    company: "Roco (Roco9 Ltd)",
    location: "Crossmaglen, Co. Armagh",
    email: "shane.connolly@roco9.com",
    emailVerified: true,
    phone: "+44 28 3086 1234",
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
  },
  {
    id: "andrew-jones",
    name: "Andrew Jones",
    title: "Managing Director",
    company: "S Jones Containers",
    location: "Aldridge, UK",
    email: "andrew.jones@sjonescontainers.co.uk",
    emailVerified: true,
    phone: "+44 1922 741751",
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
  },
  {
    id: "jeremy-lamb",
    name: "Jeremy Lamb",
    title: "Managing Director",
    company: "EirEng Consulting Engineers",
    location: "Dublin, IE & UK",
    email: "jeremy.lamb@eireng.com",
    emailVerified: true,
    phone: "+353 1 234 5678",
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
  },
  {
    id: "mohammed-hussain",
    name: "Mohammed Shahed Hussain",
    title: "Director",
    company: "Stirling Castle Construction Limited",
    location: "Hounslow, UK",
    email: "mohammed.hussain@stirlingcastleconstruction.co.uk",
    emailVerified: true,
    phone: "+44 20 8123 4567",
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
  },
  {
    id: "james-gilbert",
    name: "James Gilbert",
    title: "Managing Director",
    company: "G B Hydraulics Ltd",
    location: "Thatcham, UK",
    email: "james.gilbert@gbhydraulics.com",
    emailVerified: true,
    phone: "+44 1635 123456",
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
  },
  {
    id: "william-duenas",
    name: "William Jay Duenas",
    title: "Director",
    company: "Satoshi Solutions Ltd",
    location: "Addlestone, UK",
    email: "william.duenas@satoshisolutions.co.uk",
    emailVerified: true,
    phone: "+44 1932 987654",
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
  },
  {
    id: "maurice-ryan",
    name: "Maurice Ryan",
    title: "Managing Director",
    company: "P J Edwards & Co",
    location: "Dublin, IE & UK",
    email: "maurice.ryan@pjedwards.ie",
    emailVerified: true,
    phone: "+353 1 987 6543",
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
  },
];

// SENDING is deliberately excluded from both — it means the send is still in
// flight (approved/sending backend status), not yet actually dispatched, so it
// must not count toward "Emails Delivered" or the bounce/reply-rate denominator.
const sentStatuses: ProspectStatus[] = ["DELIVERED", "BOUNCED", "RESPONDED"];
const deliveredStatuses: ProspectStatus[] = ["DELIVERED", "RESPONDED"];

/** Pure aggregation so real (Supabase-backed) prospect lists can reuse the same math. */
export function computeDashboardStats(list: Prospect[]): DashboardStats {
  const sentCount = list.filter((p) => sentStatuses.includes(p.status)).length;
  const deliveredCount = list.filter((p) => deliveredStatuses.includes(p.status)).length;
  const bouncedCount = list.filter((p) => p.status === "BOUNCED").length;
  const respondedCount = list.filter((p) => p.status === "RESPONDED").length;

  return {
    emailsDelivered: deliveredCount,
    bounceRatePct: sentCount ? (bouncedCount / sentCount) * 100 : 0,
    replyRatePct: sentCount ? (respondedCount / sentCount) * 100 : 0,
    totalDrafted: list.length,
  };
}

/** Derived straight from `prospects` — no hand-typed campaign numbers. */
export const dashboardStats: DashboardStats = {
  ...computeDashboardStats(prospects),
  // ICP health comes from the real `runs` table (Workenvo account only) — this
  // account has no runs, so its tile shows an illustrative value like the rest
  // of this account's data.
  icpHealthPct: 88,
  icpHealthNote: "Steady sourcing across this week's runs.",
};
