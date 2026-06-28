import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Section accordion ────────────────────────────────────────────────────────

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-xl shrink-0">{emoji}</span>
        <span className="flex-1 text-sm font-semibold text-gray-100">{title}</span>
        {open ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-800 text-sm text-gray-300 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-3 mb-1">{children}</p>
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">•</span><span>{children}</span></li>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1.5">{children}</ul>
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
      <span>{children}</span>
    </li>
  )
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-2">{children}</ol>
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-300">
      <span className="font-bold">Tip: </span>{children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function About() {
  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">About VivTrack</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete guide to every feature</p>
      </div>

      {/* Intro card */}
      <div className="px-4 mb-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-sm text-emerald-200 font-semibold mb-1">Welcome to VivTrack 🦎</p>
          <p className="text-xs text-emerald-300/80 leading-relaxed">
            VivTrack is a full husbandry management app built for exotic pet keepers. It tracks every animal, enclosure, plant, feeder colony, breeding project, and expense in your collection. Your data is stored securely in the cloud and syncs across all your devices automatically — no manual backups required.
          </p>
          <p className="text-xs text-emerald-300/60 mt-2">Tap any section below to expand it.</p>
        </div>
      </div>

      <div className="px-4 space-y-2">

        {/* ── Dashboard ─────────────────────────────────────────────────── */}
        <Section emoji="🏠" title="Dashboard">
          <p>The Dashboard is your daily command center. Every time you open the app it shows you exactly what needs attention today across your entire collection.</p>
          <H>What you'll see</H>
          <Ul>
            <Li><strong>Overdue tasks</strong> — highlighted in red. These are past-due care events (feedings, water changes, misting, etc.) that haven't been logged yet.</Li>
            <Li><strong>Due today</strong> — shown in orange/amber. Need attention within the current day.</Li>
            <Li><strong>Upcoming</strong> — shown in green. On schedule but coming soon.</Li>
            <Li><strong>Recent activity</strong> — a quick log of the last few care events across all animals.</Li>
            <Li><strong>Colony alerts</strong> — if any feeder colony is below its low-stock threshold, an alert card appears here.</Li>
          </Ul>
          <H>Auto-misting</H>
          <p>Animals with an automatic misting schedule (set in their Schedule tab) will have misting events auto-logged when the app opens if they were missed. This uses a 30-minute window around each scheduled time over the past 48 hours.</p>
          <Tip>Check the Dashboard first thing each morning — it tells you exactly what to do today without having to scroll through each animal's profile.</Tip>
        </Section>

        {/* ── Animals ───────────────────────────────────────────────────── */}
        <Section emoji="🐍" title="Animals">
          <p>The Animals section is the core of VivTrack. Every animal in your collection gets its own profile with a complete care history.</p>
          <H>Adding an animal</H>
          <Steps>
            <Step n={1}>Tap the Animals tab in the bottom nav, then tap the <strong>+</strong> button.</Step>
            <Step n={2}>Fill in the name, species, morph/phase, sex, and date of birth.</Step>
            <Step n={3}>Add acquisition date and source (breeder, rescue, pet store, etc.).</Step>
            <Step n={4}>Optionally link the animal to an enclosure.</Step>
            <Step n={5}>Tap Save. The animal now appears in your collection list.</Step>
          </Steps>
          <H>Animal profile tabs</H>
          <Ul>
            <Li><strong>Overview</strong> — Quick stats, last fed/misted/weighed dates, recent activity feed, and links to linked enclosure and feeder colonies.</Li>
            <Li><strong>Care Log</strong> — Full chronological list of every logged care event. Tap the trash icon on any entry to delete it. Tap the + FAB to log a new event.</Li>
            <Li><strong>Schedule</strong> — Set care intervals and a start date (see Schedule section below).</Li>
            <Li><strong>Weight</strong> — Line chart of all weight records over time, with the full list below.</Li>
            <Li><strong>Photos</strong> — Photo gallery for this animal. Tap + to add from your camera roll.</Li>
            <Li><strong>Medications</strong> — Track active and past medication courses with dose logs.</Li>
            <Li><strong>Notes</strong> — Free-form notes that appear on exported PDF care sheets.</Li>
          </Ul>
          <H>Editing & deleting</H>
          <Ul>
            <Li>Tap the pencil icon in the top-right of the animal profile to edit any field.</Li>
            <Li>At the bottom of the edit page there is a Delete Animal button — this removes the animal and all associated care events, weight records, and schedules.</Li>
          </Ul>
          <Tip>Add a date of birth even if it's estimated — the age is shown throughout the app and on exported care sheets.</Tip>
        </Section>

        {/* ── Quick Log / Care Events ───────────────────────────────────── */}
        <Section emoji="📋" title="Quick Log & Care Events">
          <p>The Quick Log is how you record everything that happens with your animals. It's designed for speed — you can log a feeding in under 10 seconds.</p>
          <H>Opening Quick Log</H>
          <p>From any animal's profile, tap the green <strong>+</strong> button (FAB) in the bottom-right corner. You can also navigate to it from the Tasks page or Dashboard by tapping a task card.</p>
          <H>Event types</H>
          <Ul>
            <Li><strong>🍖 Feeding</strong> — Record the prey/food item, quantity, result (accepted/refused/partial/regurgitated), and whether it was frozen-thawed. Optionally select a feeder colony to auto-deduct stock.</Li>
            <Li><strong>💧 Misting</strong> — Simple timestamp log. Misting intervals use this to calculate the next due time.</Li>
            <Li><strong>🫙 Watering</strong> — Log a water bowl change or top-up.</Li>
            <Li><strong>🧹 Spot Clean</strong> — Spot/substrate surface cleaning. Resets the spot clean timer.</Li>
            <Li><strong>🪨 Substrate Change</strong> — Full substrate replacement. Resets the substrate change timer.</Li>
            <Li><strong>✨ Full Clean</strong> — Complete enclosure breakdown and clean.</Li>
            <Li><strong>🔄 Shed</strong> — Record shed result: complete, partial, stuck shed, or assisted.</Li>
            <Li><strong>⚖️ Weight</strong> — Enter grams. Automatically added to the weight chart and weight history.</Li>
            <Li><strong>🤝 Handling</strong> — Log a handling session with duration in minutes.</Li>
            <Li><strong>📝 Note</strong> — Free-form text note attached to a timestamp.</Li>
            <Li><strong>🌡️ Temp Check</strong> — Record a temperature observation.</Li>
            <Li><strong>☁️ Humidity</strong> — Record a humidity reading (%).</Li>
          </Ul>
          <H>Logging with a feeder colony</H>
          <p>When logging a Feeding event, if you have feeder colonies set up, a colony selector appears. Selecting a colony: (1) pre-fills the prey item name, (2) auto-deducts the quantity from the colony's estimated count, (3) creates a harvest event in the colony log, and (4) if the colony has pricing set, automatically creates a Food expense entry.</p>
          <Tip>Use the date/time field to backdate events if you forgot to log something — the time picker defaults to now but is fully editable.</Tip>
        </Section>

        {/* ── Care Schedule ─────────────────────────────────────────────── */}
        <Section emoji="⏱️" title="Care Schedule & Custom Tasks">
          <p>The Schedule tab on each animal's profile is where you define how often each type of care should happen. The app uses these intervals to calculate upcoming and overdue tasks.</p>
          <H>Setting up a schedule</H>
          <Steps>
            <Step n={1}>Open an animal's profile and tap the <strong>Schedule</strong> tab.</Step>
            <Step n={2}>Set the <strong>Schedule Start Date</strong> — this is when task tracking begins. Without it, tasks only appear after the first event of each type has been logged.</Step>
            <Step n={3}>Fill in intervals for each care type you want to track: Feeding (days), Misting (hours or days), Water Change (days), Spot Clean (days), Substrate Change (days).</Step>
            <Step n={4}>Tap <strong>Save Schedule</strong>.</Step>
          </Steps>
          <H>Misting options</H>
          <Ul>
            <Li><strong>Manual interval</strong> — set an interval in hours or days. Tasks are projected from the last misting event.</Li>
            <Li><strong>Automatic (times of day)</strong> — enter specific times (e.g. 8:00 AM, 6:00 PM). The app auto-logs misting at these times when it opens, within a 30-minute window.</Li>
            <Li><strong>None</strong> — disables misting tracking for this animal.</Li>
          </Ul>
          <H>Custom tasks</H>
          <p>Need to track something not on the built-in list? Add a Custom Task at the bottom of the Schedule tab:</p>
          <Ul>
            <Li>Give it a name (e.g. "UVB Bulb Check", "Bioactive Supplement", "Weigh Eggs").</Li>
            <Li>Set an interval: any number of hours, days, weeks, or months.</Li>
            <Li>Optionally set a custom start date for this specific task.</Li>
          </Ul>
          <p>Custom tasks appear on the Tasks calendar and can be logged inline from the Tasks page without navigating to Quick Log.</p>
          <Tip>Set the Schedule Start Date to the day you acquired the animal so tasks appear immediately — you don't need to log anything first.</Tip>
        </Section>

        {/* ── Tasks ─────────────────────────────────────────────────────── */}
        <Section emoji="📅" title="Tasks Calendar">
          <p>The Tasks page (More → Tasks) shows all upcoming care events for every animal in a calendar view, projected forward from their schedules.</p>
          <H>How tasks are calculated</H>
          <p>For each care type, the app finds the most recent logged event of that type. The next due date is: <em>last event date + interval</em>. If no event has been logged yet, it falls back to the animal's <strong>Schedule Start Date</strong>. If neither exists, no task is shown for that type.</p>
          <H>Viewing tasks</H>
          <Ul>
            <Li>Switch between <strong>Day</strong>, <strong>Week</strong>, and <strong>Month</strong> views using the tabs at the top.</Li>
            <Li>Overdue tasks appear in red, due-today in amber, upcoming in emerald.</Li>
            <Li>Tap a task card to navigate directly to Quick Log for that animal and event type.</Li>
            <Li>Custom task cards have a <strong>Log</strong> button that records the event inline without leaving the Tasks page.</Li>
          </Ul>
          <H>Adding & editing tasks from the Tasks page</H>
          <Ul>
            <Li>Tap the <strong>+</strong> FAB to add a new task — choose the animal, task type, interval, and start date.</Li>
            <Li>Tap the <strong>pencil</strong> icon on any existing task card to edit its interval or start date without going to the animal's profile.</Li>
          </Ul>
          <Tip>The Tasks page is the fastest way to get a full picture of what's needed across your entire collection at once.</Tip>
        </Section>

        {/* ── Enclosures ────────────────────────────────────────────────── */}
        <Section emoji="🏠" title="Enclosures">
          <p>Track every enclosure in your collection with detailed husbandry parameters, lighting, substrate, and a QR code for fast access.</p>
          <H>Adding an enclosure</H>
          <Steps>
            <Step n={1}>Tap <strong>Enclosures</strong> in the bottom nav, then tap <strong>+</strong>.</Step>
            <Step n={2}>Enter a name, type (terrarium, vivarium, aquarium, etc.), and dimensions (L×W×H in cm).</Step>
            <Step n={3}>Add substrate layers — each layer has a type, depth, and optional mix ratio.</Step>
            <Step n={4}>Add lighting bulbs — type, brand, wattage, UVB rating, install date, and expected lifespan. The app calculates replacement due dates automatically.</Step>
            <Step n={5}>Set temperature zones (e.g. warm side, cool side, basking spot) with target min/max in °F.</Step>
            <Step n={6}>Set humidity target range (min and max %).</Step>
          </Steps>
          <H>QR codes</H>
          <p>Every enclosure has a unique QR code displayed in its detail page. Print it and stick it to the enclosure lid. When scanned with VivTrack's Scanner page, it opens the Quick Log for the animal linked to that enclosure — perfect for night checks.</p>
          <H>Linking to animals</H>
          <p>When editing an animal, you can link it to an enclosure. The enclosure name then appears on the animal's overview, and the animal's name appears on the enclosure detail.</p>
          <Tip>Add all your bulbs with install dates — the Dashboard will show replacement warnings when they're approaching end of life.</Tip>
        </Section>

        {/* ── Plants ────────────────────────────────────────────────────── */}
        <Section emoji="🌿" title="Plants">
          <p>Track your plant collection — whether standalone or in bioactive vivariums. Access via the Plants tab in the bottom nav.</p>
          <H>Adding a plant</H>
          <Ul>
            <Li>Tap <strong>+</strong> to add a plant. Enter common name, botanical species, type (tropical, succulent, bromeliad, fern, etc.), and status (thriving, stable, struggling, dormant).</Li>
            <Li>Set light needs, watering frequency (days), and mark whether the species is animal-safe.</Li>
            <Li>Optionally link to an enclosure if it's planted in a bioactive setup.</Li>
          </Ul>
          <H>Care events for plants</H>
          <p>From a plant's profile, log events: Watering, Fertilizing, Pruning, Repotting, Propagation, Health Check, or a Note. Last watered and last fertilized dates update automatically.</p>
          <H>Photos</H>
          <p>Each plant profile has a photo gallery. Use it to track growth, document new leaves, or record health issues over time.</p>
          <Tip>Link plants to enclosures so you can see which plants are in which bioactive setup from the enclosure detail page.</Tip>
        </Section>

        {/* ── Feeder Colonies ───────────────────────────────────────────── */}
        <Section emoji="🪲" title="Feeder Colonies & Clean-Up Crew">
          <p>Manage all the living cultures that support your collection. Access via More → Colonies.</p>
          <H>Feeder colonies</H>
          <p>Track live feeders (dubias, crickets, mealworms, BSFL, hornworms, waxworms) and frozen prey stock. Each colony record stores the species, estimated count, and feeding/care notes.</p>
          <Ul>
            <Li><strong>Adding a colony</strong> — tap + on the Feeders tab. Set a name, species, type, initial estimated count, and low-stock threshold.</Li>
            <Li><strong>Logging events</strong> — tap a colony card to log: Harvest (how many removed and fed to which animal), Feed (gutloading the colony), Restock (adding new feeders), Count Check, or a Die-off note.</Li>
            <Li><strong>Pricing</strong> — set a cost per X feeders (e.g. $25 per 500 dubias). The app uses this to auto-calculate food expenses when you harvest via Quick Log.</Li>
            <Li><strong>Colony value</strong> — shown on the card as an estimated dollar value based on current count and your pricing.</Li>
            <Li><strong>Low-stock alerts</strong> — appear on the Dashboard when estimated count falls below your threshold.</Li>
          </Ul>
          <H>Clean-up crew (CUC)</H>
          <p>Track isopod and springtail cultures — either standalone or seeded into bioactive enclosures.</p>
          <Ul>
            <Li>Species examples: powder orange/blue isopods, Armadillidium, Cubaris, Folsomia candida springtails.</Li>
            <Li>Log feeding, supplementing (calcium, protein, leaf litter), counting, splitting cultures, or seeding into an enclosure.</Li>
            <Li>Track reproduction health: thriving, stable, declining, or unknown.</Li>
          </Ul>
          <Tip>Set the low-stock threshold on your main feeder colonies so you get Dashboard alerts before you run out between feeding windows.</Tip>
        </Section>

        {/* ── Breeding ──────────────────────────────────────────────────── */}
        <Section emoji="🥚" title="Breeding">
          <p>Full breeding record tracking from first pairing through hatching. Access via More → Breeding.</p>
          <H>Creating a pairing</H>
          <Steps>
            <Step n={1}>Tap <strong>+</strong> to create a new pairing.</Step>
            <Step n={2}>Select the female and male from your animals list.</Step>
            <Step n={3}>Set the season year and any notes. Tap Create Pairing.</Step>
          </Steps>
          <H>Status lifecycle</H>
          <p>Update the record's status as the season progresses by tapping a status chip in the detail sheet:</p>
          <Ul>
            <Li><strong>💞 Pairing</strong> — actively being paired or introduced.</Li>
            <Li><strong>🫄 Gravid</strong> — female confirmed gravid post-ovulation, pre-lay.</Li>
            <Li><strong>🥚 Incubating</strong> — eggs laid and in incubator.</Li>
            <Li><strong>🐣 Hatched</strong> — successful hatch.</Li>
            <Li><strong>❌ Infertile</strong> — eggs confirmed infertile.</Li>
            <Li><strong>💔 Failed</strong> — clutch failed for other reasons.</Li>
          </Ul>
          <H>Logging pairing events</H>
          <p>Tap <strong>Log Event</strong> in the Pairing Events section. Enter the date and result (Copulation Observed, Locked Up, No Interest, Unknown) plus optional notes. All events are logged chronologically.</p>
          <H>Clutch details</H>
          <p>Fill in the Clutch Details section: ovulation date, pre-lay shed count, lay date, total clutch size, and confirmed fertile count. Save these before starting an incubation log.</p>
          <H>Incubation log</H>
          <Steps>
            <Step n={1}>Set the lay date in Clutch Details and save.</Step>
            <Step n={2}>In the Incubation section, enter target temperature (°F), humidity %, incubation medium, and expected hatch date.</Step>
            <Step n={3}>Tap <strong>Start Incubation Log</strong>. An egg grid is created sized to your clutch count.</Step>
            <Step n={4}>Log daily readings: temperature (°F) and humidity %. The last reading is always shown at the top.</Step>
            <Step n={5}>Tap any egg in the grid to cycle its status: Unknown → Viable → Infertile → Collapsed → Hatched. A summary count shows at the bottom.</Step>
          </Steps>
          <H>Hatch record</H>
          <p>When hatchlings emerge, fill in the Hatch Record section with the hatch date and number of hatchlings. Tap Save Hatch Record — the status automatically updates to Hatched.</p>
          <Tip>Log candling results by updating egg statuses after each candling session — Viable for developing eggs, Infertile for slugs, Collapsed for failed eggs.</Tip>
        </Section>

        {/* ── Expenses ──────────────────────────────────────────────────── */}
        <Section emoji="💰" title="Expenses">
          <p>Track every cost associated with your collection — manually or automatically. Access via More → Expenses.</p>
          <H>Manual expense entry</H>
          <Steps>
            <Step n={1}>Tap <strong>+</strong> (FAB) to open the Add Expense sheet.</Step>
            <Step n={2}>Select a category by scrolling the chip row: Food, Substrate, Equipment, Enclosure, Veterinary, Medication, Electricity, Supplements, Decor, Animal Purchase, Shipping, Other.</Step>
            <Step n={3}>Enter a description, dollar amount, and date.</Step>
            <Step n={4}>Optionally link the expense to a specific animal.</Step>
            <Step n={5}>Add any notes and tap Save.</Step>
          </Steps>
          <H>Auto-tracked feeder expenses</H>
          <p>When you log a feeding harvest from Quick Log using a colony that has pricing set, a Food expense is created automatically. The expense shows the animal name, colony name, and quantity fed. This ensures your food costs are always accurate without double-entry.</p>
          <H>Reading the Expenses page</H>
          <Ul>
            <Li><strong>Month navigator</strong> — use ← → arrows to browse past months.</Li>
            <Li><strong>Totals row</strong> — this month total and year-to-date total.</Li>
            <Li><strong>Category breakdown</strong> — bar chart showing spend by category as a percentage of the month's total.</Li>
            <Li><strong>Per-animal breakdown</strong> — top 5 animals by total spend this month.</Li>
            <Li><strong>Expense list</strong> — all entries grouped by date, with auto-source badge on auto-generated entries.</Li>
          </Ul>
          <H>Deleting an expense</H>
          <p>Tap the trash icon on any expense entry. A confirmation prompt appears before deletion.</p>
          <Tip>Set pricing on your feeder colonies ($ per X feeders) once and all future harvest expenses will be auto-calculated — no manual tracking needed.</Tip>
        </Section>

        {/* ── Export ────────────────────────────────────────────────────── */}
        <Section emoji="📤" title="Export & Backup">
          <p>Export your data in multiple formats for spreadsheet analysis, vet visits, rehoming, or full data backups. Access via More → Export.</p>
          <H>PDF care sheets</H>
          <Steps>
            <Step n={1}>In the PDF Care Sheets section, check one or more animals using the checkboxes.</Step>
            <Step n={2}>Tap <strong>Select all</strong> to select every animal at once.</Step>
            <Step n={3}>Tap <strong>Generate PDF</strong>. The app fetches all care data and opens a print-ready document in a new tab.</Step>
            <Step n={4}>Use your browser's print dialog (Ctrl+P / Cmd+P) to print or save as PDF.</Step>
          </Steps>
          <p>Each animal gets <strong>3 pages</strong>:</p>
          <Ul>
            <Li><strong>Page 1 — Profile</strong>: Name, species, morph, sex, age, acquisition info, care schedule, last recorded dates, and weight history.</Li>
            <Li><strong>Page 2 — Care Log</strong>: Table of the last 80 care events (date, type, details, notes).</Li>
            <Li><strong>Page 3 — Transport/Vet Record</strong>: Fillable form with purpose checkboxes (Veterinary / Transport / Rehoming / Other), blank write-in lines, contact fields, and signature lines for both the <em>releasing party</em> (current owner) and the <em>receiving party</em> (vet, transporter, rescue, or new owner).</Li>
          </Ul>
          <H>CSV exports</H>
          <p>One-tap downloads — each opens as a spreadsheet file compatible with Excel, Google Sheets, and Numbers:</p>
          <Ul>
            <Li><strong>Animal List</strong> — name, species, morph, sex, DOB, age, status, acquisition info, enclosure, notes.</Li>
            <Li><strong>Enclosure List</strong> — name, type, dimensions, substrate, temperature zones, humidity.</Li>
            <Li><strong>Plant List</strong> — name, species, type, status, enclosure, light needs, last watered, animal-safe flag.</Li>
            <Li><strong>Combined Collection</strong> — all animals, enclosures, and plants in a single sheet with a "Record Type" column.</Li>
            <Li><strong>Care Events</strong> — every care event ever logged, with all fields (date, animal, type, details, notes).</Li>
            <Li><strong>Breeding Records</strong> — all pairings with status, clutch data, and hatch results.</Li>
            <Li><strong>Expense Report</strong> — all expenses with category, description, amount, animal, and auto-source flag.</Li>
          </Ul>
          <H>JSON backup</H>
          <p>Downloads all 9 data tables (animals, enclosures, care events, weight records, plants, colonies, breeding records, incubation logs, expenses) as a single timestamped JSON file. Use this to archive your data or restore it later.</p>
          <Tip>Generate a PDF care sheet before any vet visit — hand it to the vet at check-in so they have the complete care history without having to ask.</Tip>
        </Section>

        {/* ── Scanner ───────────────────────────────────────────────────── */}
        <Section emoji="📷" title="Scanner">
          <p>Scan QR codes to jump directly to an animal's Quick Log without navigating through the app. Ideal for night checks when you're moving enclosure to enclosure in the dark.</p>
          <H>How it works</H>
          <Steps>
            <Step n={1}>Open an enclosure's detail page and find the QR code section.</Step>
            <Step n={2}>Print the QR code and stick it to the enclosure lid or front panel.</Step>
            <Step n={3}>Next time you need to log something, open More → Scanner (or the Scanner tab if shown).</Step>
            <Step n={4}>Point the camera at the QR code — the app instantly navigates to Quick Log for the linked animal.</Step>
          </Steps>
          <H>NFC (Android only)</H>
          <p>On Android devices with NFC support, you can write a tag using the Enclosure Detail page and then tap your phone to the tag (attached to the enclosure) to open the Quick Log — no camera required.</p>
          <H>Manual fallback</H>
          <p>The Scanner page also has a manual text entry field if the camera or NFC isn't available.</p>
          <Tip>Small QR code sticker labels work great — print a page of QR codes for all enclosures, cut them out, and stick them somewhere easy to reach on each enclosure.</Tip>
        </Section>

        {/* ── Species Browser ───────────────────────────────────────────── */}
        <Section emoji="📖" title="Species Browser">
          <p>Browse built-in care guides for 100+ exotic species without needing to add an animal first. Access via More → Species.</p>
          <H>What's included</H>
          <Ul>
            <Li><strong>Reptiles</strong> — Ball python, boa, corn snake, king snake, bearded dragon, leopard gecko, crested gecko, blue-tongue skink, chameleons, monitors, iguanas, tegus, tortoises, box turtles, sliders, and many more.</Li>
            <Li><strong>Amphibians</strong> — Pacman frog, White's tree frog, red-eyed tree frog, dart frogs, axolotl, tiger salamander, fire-bellied toad.</Li>
            <Li><strong>Invertebrates</strong> — Tarantulas (rose hair, GBB, Mexican red knee, OBT, etc.), emperor scorpion, millipedes, mantids, hissing cockroaches, stick insects, giant African land snails.</Li>
            <Li><strong>Exotic mammals</strong> — Sugar glider, hedgehog, chinchilla, degu, ferret, prairie dog, short-tailed opossum.</Li>
            <Li><strong>Birds</strong> — Cockatiel, conures, African grey, budgerigar.</Li>
          </Ul>
          <H>Species detail page</H>
          <p>Each species guide includes: temperature zones (cool side, warm side, basking), humidity range and misting frequency, UVB requirements and bulb type, enclosure style and minimum size, substrate options, feeding prey items and frequency, lifespan range, common health issues, and special notes.</p>
          <Tip>Use the Species Browser when researching a new animal before adding it to your collection — all the husbandry parameters you need in one place.</Tip>
        </Section>

        {/* ── Settings ──────────────────────────────────────────────────── */}
        <Section emoji="⚙️" title="Settings">
          <p>Access via More → Settings.</p>
          <Ul>
            <Li><strong>Theme</strong> — Switch between Dark, Light, or System (follows your device setting). VivTrack's dark theme is optimized for night feeding checks.</Li>
            <Li><strong>Account</strong> — View your logged-in email address and subscription status.</Li>
            <Li><strong>Subscription</strong> — Manage your VivTrack Pro subscription. Pro unlocks unlimited animals, advanced features, and priority support.</Li>
            <Li><strong>Promo code</strong> — Enter a promo or beta code to activate Pro access.</Li>
            <Li><strong>Sign out</strong> — Logs you out. Your data remains in the cloud and will reload when you sign back in.</Li>
          </Ul>
        </Section>

        {/* ── Tips ──────────────────────────────────────────────────────── */}
        <Section emoji="💡" title="Tips & Best Practices">
          <Ul>
            <Li><strong>Set a Schedule Start Date</strong> for every animal right when you add them — tasks appear on the calendar immediately without needing to log anything first.</Li>
            <Li><strong>Link feeder colonies to animals</strong> — when logging a feeding, selecting the colony auto-deducts stock and (if priced) auto-creates the expense.</Li>
            <Li><strong>Print QR codes</strong> for every enclosure — scanning instead of navigating is 5x faster during night checks.</Li>
            <Li><strong>Log refusals</strong> as feeding events — the feeding interval resets from the refusal date, keeping your schedule accurate even when an animal is off food.</Li>
            <Li><strong>Use Custom Tasks</strong> for anything not on the built-in list: bulb checks, supplement rotations, bioactive supplementing, weigh-ins during brumation, etc.</Li>
            <Li><strong>Generate a PDF before vet visits</strong> — handing the vet a printed care sheet with full history saves time and gives them complete context.</Li>
            <Li><strong>Log weights consistently</strong> — even monthly readings build a meaningful chart over time and help catch health issues early (especially during brumation).</Li>
            <Li><strong>Use the JSON backup</strong> periodically — your data is cloud-synced, but a local backup is a good safety net.</Li>
            <Li><strong>Breeding records work best</strong> when you set the lay date in Clutch Details before starting an incubation log — the egg grid is sized to your clutch count.</Li>
            <Li><strong>The Dashboard resets</strong> task status each time you open the app — if a task moved from overdue to done, it disappears after you log it and the next interval begins automatically.</Li>
          </Ul>
        </Section>

        {/* ── Data & Privacy ────────────────────────────────────────────── */}
        <Section emoji="🔒" title="Data & Privacy">
          <p>VivTrack stores all your data in a secure Supabase (PostgreSQL) database hosted in the cloud.</p>
          <Ul>
            <Li><strong>Your data is yours</strong> — only your account can read or write your records. Row-level security ensures no other user can access your collection.</Li>
            <Li><strong>Syncs automatically</strong> — changes made on one device appear instantly on all others via real-time database subscriptions.</Li>
            <Li><strong>No third-party tracking</strong> — VivTrack does not sell or share your data.</Li>
            <Li><strong>Export anytime</strong> — use the Export page to download a full JSON backup of everything whenever you want.</Li>
            <Li><strong>Account deletion</strong> — deleting your account removes all associated data from the database (cascade delete on all tables).</Li>
          </Ul>
        </Section>

      </div>

      {/* Footer */}
      <div className="px-4 mt-6 pb-2">
        <div className="text-center">
          <p className="text-xs text-gray-600">VivTrack — Built for exotic pet keepers</p>
          <p className="text-xs text-gray-700 mt-0.5">Questions or feedback? Use the Settings page to contact support.</p>
        </div>
      </div>
    </div>
  )
}
