# Siyabona — Simulated User Interviews (50)

> **These interviews are synthetic.** They were generated from the challenge
> brief and the current feature set to stress-test the product idea. The people
> are fictional composites, not real research participants. Use them for demo
> prep, pitch framing (the brief's *Community Impact* criterion) and to choose
> what to build next — not as evidence of real demand.

Each interview asked the same core questions:

1. How do you report or hear about safety incidents today?
2. Would you use Siyabona? Why or why not?
3. Walk me through how you would use it.
4. What would stop you, or what is missing?

Features shown to every interviewee: the resident report form (incident type,
location with GPS, description, optional photo, anonymous toggle, English /
isiZulu / Afrikaans, 10111 / 112 emergency notice), AI triage (severity,
one-line summary, category), the resident status tracker
(new → acknowledged → dispatched → resolved), and the responder dashboard
(live map, priority queue, analytics, heatmap).

## Summary

| Verdict | Count | Share |
|---|---|---|
| Would use | 28 | 56% |
| Maybe / with conditions | 14 | 28% |
| Would not use | 8 | 16% |

| Group | Interviewees | Would use | Maybe | Would not |
|---|---|---|---|---|
| Residents and community members | 31 | 18 | 8 | 5 |
| Responders, officials and organisations | 19 | 10 | 6 | 3 |

### What made people say yes

- **One place instead of WhatsApp noise** (#1, #2, #17, #31). Group admins and
  councillors want a single, sorted list; residents want to stop scrolling past
  lost-dog posts to find the hijacking alert.
- **Anonymous reporting** (#7, #18, #25, #42, #47). Fear of retaliation from
  gangs, dealers or neighbours is the main reason people stay silent. "Your name
  is never stored" was the single most persuasive line in the form.
- **Proof that someone saw it** (#2, #21, #27, #45). The status tracker turns
  "I reported it into the void" into "acknowledged at 21:14".
- **Text-first reporting** (#21, #45). Deaf users and people with no airtime
  but Wi-Fi access cannot or will not phone 10111.
- **Priority queue for responders** (#5, #30, #39, #49). Control rooms already
  drown in reports; AI severity sorting is the feature they asked about first.
- **Heatmap and analytics for budgets** (#15, #17, #44). Councillors and
  officials want data to argue for street lights, patrols and repairs.

### What made people hesitate or say no

| Barrier | Raised by | Status in current build |
|---|---|---|
| Missing languages — isiXhosa, Sepedi, Xitsonga | #19, #33, #40 | Only EN / ZU / AF |
| No smartphone or no data — needs USSD / SMS / WhatsApp bot | #12, #29, #50 | Not built |
| "Nobody responds anyway" — needs a real response team behind it | #2, #46 | Organisational, not technical |
| Distrust of AI judging severity — wants a reason shown | #16, #32, #34 | Severity shown, reason not |
| False or malicious reports, gaming the triage, who sees the dashboard | #28, #32, #34, #36 | Reporter names hidden; dashboard not access-controlled |
| Fear of who receives reports | #9, #47 | Anonymous toggle exists; recipients not explained |
| Rural signal and speed — radio networks are faster | #4, #38 | Not addressed |
| Duplicate reports of the same incident | #10, #30, #35, #49 | Not built |
| Needs a reference number for police / insurance | #6, #43 | Incident ID exists, not shown as a reference |
| Wrong channel for GBV and medical emergencies | #11, #16, #24 | 10111 / 112 notice exists; no GBV signpost |
| Privacy / POPIA, where data is stored | #26 | Data in af-south-1 (Cape Town); no privacy notice |

### Most requested additions (ranked by mentions)

1. Resident-facing safety map or public stats (#7, #14, #35, #37, #41, #46) — 6
2. Export / integration with existing dispatch or ticketing systems (#5, #6, #23, #31) — 4
3. Merge duplicate reports of the same incident (#10, #30, #35, #49) — 4
4. Extra categories: flood/weather, illegal dumping, student in distress, GBV signpost (#24, #39, #42, #44) — 4
5. More SA languages: isiXhosa, Sepedi, Xitsonga (#19, #33, #40) — 3
6. USSD / SMS / WhatsApp reporting for feature phones (#12, #29, #50) — 3
7. Offline queue that sends when signal returns (#4, #38, #45) — 3
8. Show *why* the AI chose a severity (#32, #34) — 2
9. Shareable reference number on the confirmation page (#6, #43) — 2
10. Voice-note reporting (#3, #13) — 2
11. Notify the reporter when status changes (#2, #27) — 2

### Pitch takeaways

- Lead the demo with a resident story (anonymous gang-violence report from #18
  or a deaf user from #21) and then switch to the control-room view (#5 or #49).
- Answer "who responds?" before judges ask: CPFs, private security, ward
  structures, campus protection and municipal call centres all said they would
  staff the dashboard.
- Name the gaps honestly: languages, USSD, duplicate merging. They show the
  team understands deployment, which the *Community Impact* criterion rewards.

---

## Interviews

### 01 — Thandiwe Mokoena, 34, neighbourhood-watch WhatsApp admin, Bryanston
**Verdict: Would use**

**Today:** "I run two WhatsApp groups, 480 people. Someone posts a hijacking,
then 60 people reply 'shame' and 'stay safe', then someone posts a lost
Labrador. By the time the patrol sees it, it's scrolled away."

**Would you use it?** "Yes. Honestly I'd make it the rule: real incidents go
on Siyabona, chatter stays on WhatsApp. I'd pin the link."

**How:** She would post the report link in the group description, ask members
to report there, and watch the dashboard on her laptop in the evenings. The
priority queue is what sold her: "Critical at the top. That's my whole job
done for me."

**Missing:** A daily digest she can paste back into WhatsApp so the group
still feels informed.

---

### 02 — Sipho Dlamini, 52, Community Policing Forum chairperson, Alexandra
**Verdict: Would use**

**Today:** Residents phone him directly, sometimes at 2 a.m. He relays to the
SAPS sector vehicle by phone. Nothing is recorded.

**Would you use it?** "Yes, but only if someone is on the other side. People
in Alex have reported things for years and nothing happens. If the tracker says
'acknowledged' and nobody comes, you've lost them forever."

**How:** CPF patrollers watch the dashboard on a tablet at the CPF office;
the chair moves incidents to *acknowledged* and *dispatched* as patrollers go
out. He'd use the analytics at monthly sector meetings with SAPS.

**Missing:** A way to assign an incident to a named patroller, and an SMS
back to the reporter when it's resolved.

---

### 03 — Gogo Nomvula Zulu, 71, pensioner, Orlando East, Soweto
**Verdict: Maybe**

**Today:** She shouts for neighbours or phones her son.

**Would you use it?** "Ngesizulu? Kuhle lokho." (In isiZulu? That's good.)
"But my eyes and these small phones… My granddaughter would do it for me."

**How:** Her granddaughter would report on her behalf: broken street light,
young men selling drugs at the corner. She liked that it was anonymous.

**Missing:** Voice reporting. "Let me just talk. I can't type all that."
Bigger text.

---

### 04 — Pieter van der Merwe, 58, farmer, near Bethlehem, Free State
**Verdict: Would not use**

**Today:** Farm-watch radio network and a WhatsApp group with neighbouring
farms.

**Would you use it?** "Nee. When something happens here, I press the radio
and six bakkies are coming in four minutes. Your app: I must find signal, type,
wait for some computer. Too slow."

**How:** He might use it for non-urgent things, like stock theft found the
next morning or a fence cut, "for the record." He appreciated the Afrikaans.

**Missing:** Works with no signal. Integration with the radio network's
control room would interest him more than a phone form.

---

### 05 — Lerato Nkosi, 27, armed-response control-room operator, Randburg
**Verdict: Would use**

**Today:** Panic-button alarms, client phone calls and three community
WhatsApp groups all landing on her console.

**Would you use it?** "The dashboard, yes, immediately. The AI summary line is
exactly what I write by hand in the log."

**How:** Keep the dashboard open on a second screen, filter to their patrol
zone, sort by severity, and dispatch the nearest vehicle. The live flash on new
incidents matters on a night shift.

**Missing:** Filtering by geographic zone, and pushing an incident into their
own dispatch system instead of retyping it.

---

### 06 — Captain Ruth Maphanga, 49, SAPS station commander (fictional), Gauteng
**Verdict: Maybe**

**Today:** 10111, walk-ins at the community service centre, sector WhatsApp
groups.

**Would you use it?** "As intelligence, yes. As a case, no. A case number
needs a statement. I can't arrest someone because an app said 'high'."

**How:** Weekly review of the heatmap for crime-pattern analysis and patrol
planning. Her sector managers could watch the live feed.

**Missing:** Export to CSV for crime-analysis meetings. A clear message to
residents that this is not opening a police case. A reference number residents
can quote when they do open one.

---

### 07 — Ayanda Khumalo, 22, university student, Braamfontein
**Verdict: Would use**

**Today:** Tweets, the student-residence WhatsApp group, sometimes campus
security.

**Would you use it?** "Ja, definitely. Muggings on the way to the Gautrain are
every week. I'd report anonymous, 100%."

**How:** Report on the spot with GPS and a photo of the area. She wants to
*see* the map of recent incidents so she can choose which route to walk at
night.

**Missing:** A resident-facing map. "The responders see the map, why can't I?"

---

### 08 — Fatima Patel, 41, pharmacist, Lenasia
**Verdict: Would use**

**Today:** Calls private security, then SAPS, then posts CCTV stills on the
business-owners' WhatsApp.

**Would you use it?** "If it means one report instead of three calls, yes."

**How:** Report shoplifting and suspicious vehicles with a CCTV still as the
photo. She liked that photos are resized and location data is stripped before
upload: "I don't want my shop's exact metadata floating around."

**Missing:** A business-account view to see all reports she has made.

---

### 09 — Mohammed Abdi, 38, spaza-shop owner, Mamelodi
**Verdict: Would not use**

**Today:** Tells nobody. Fixes it himself or closes early.

**Would you use it?** "Who sees this? Police? Community? When foreigners report,
sometimes the community turns against us. I don't want trouble."

**How:** He would not report. If the local community leader ran it and he trusted
them, he might report robberies anonymously.

**Missing:** Trust, not a feature. He wanted to know exactly who reads reports.
Anonymity helped but didn't convince him; the location of a spaza shop
identifies the owner anyway.

---

### 10 — Johan Botha, 45, municipal electricity technician, Johannesburg
**Verdict: Would use**

**Today:** Cable theft reports come through the call centre hours later,
usually after the substation has already tripped.

**Would you use it?** "If residents report people digging at night under
'infrastructure', and the location is accurate, we catch them in the act."

**How:** His team would filter `type=infrastructure`, use the GPS coordinates
to find the exact pole or kiosk, and watch the severity: a live substation
break-in is critical.

**Missing:** Duplicate merging. "When a whole street goes dark, I get 40 reports
of the same thing."

---

### 11 — Nokuthula Mthembu, 31, EMS paramedic, Ekurhuleni
**Verdict: Maybe**

**Today:** Dispatched by the provincial EMS control centre.

**Would you use it?** "My worry is someone with a collapsed father types into
an app instead of phoning. Every minute matters."

**How:** Useful for non-emergency medical context, such as an elderly person
alone who hasn't been seen for days. She approved of the 10111 / 112 notice
but wants it bigger when *medical* or *fire* is chosen.

**Missing:** A tap-to-call button for medical and fire, shown before the form.

---

### 12 — Busisiwe Ndlovu, 44, domestic worker, Diepsloot
**Verdict: Would use**

**Today:** Tells her church group and her employer.

**Would you use it?** "If it doesn't eat my data. I buy 1 GB a month."

**How:** Report the taxi-rank robberies she sees at 05:30 on her way to work,
anonymously, without a photo to save data.

**Missing:** Zero-rated access or a WhatsApp version: "WhatsApp is already on,
everyone has a bundle for it."

---

### 13 — Kagiso Molefe, 29, minibus-taxi driver, Soweto to Johannesburg CBD
**Verdict: Maybe**

**Today:** Taxi radio and the association WhatsApp group.

**Would you use it?** "For robots [traffic lights] out, accidents, yes. But I
can't type while I'm driving with 15 passengers."

**How:** A passenger could report, or he'd report at the rank. He liked that
traffic-light outages are a category the AI ranks as critical.

**Missing:** Voice notes. "Taxi drivers voice-note everything."

---

### 14 — Riaan Steyn, 36, e-hailing driver, Pretoria
**Verdict: Would use**

**Today:** Driver WhatsApp groups share hijacking hotspots.

**Would you use it?** "Ja. Report and check. Mostly check."

**How:** Report suspicious vehicles following him, and use the heatmap to avoid
zones at certain hours. He was the most interested in the time-of-day heatmap.

**Missing:** Public read-only hotspot view; alerts when he enters a hot zone.

---

### 15 — Zanele Mahlangu, 39, primary-school principal, Tembisa
**Verdict: Would use**

**Today:** Letters to the district office, calls to the ward councillor.

**Would you use it?** "Yes. Learners are robbed of phones outside the gate.
Someone is selling dagga across the road. The fence is cut every weekend."

**How:** Teachers report incidents during scholar-patrol times. She would
print the analytics for the school governing body and the district.

**Missing:** A way to tag "near a school" so it gets higher priority.

---

### 16 — Dr Anika Naidoo, 46, emergency-room doctor, Soweto
**Verdict: Would not use**

**Today:** Sees the results of violence, does not report incidents.

**Would you use it?** "Not personally. I don't have time, and it isn't my
role."

**How:** N/A. She supported the idea for community safety but warned against
any impression that AI is triaging *medical* emergencies.

**Missing:** Wording that makes clear the severity is about *response
priority*, not clinical triage.

---

### 17 — Themba Sithole, 55, ward councillor, Umlazi, Durban
**Verdict: Would use**

**Today:** Residents call his cell phone. He keeps a notebook.

**Would you use it?** "This is evidence. When I go to the municipality and say
'we need lights on this road', they say 'show me'. Now I can show them."

**How:** Weekly look at the heatmap and category breakdown. Present the
infrastructure and suspicious-activity counts at ward committee meetings.

**Missing:** Filter by ward boundary. Monthly PDF report.

---

### 18 — Charlene Adams, 33, mother of three, Mitchells Plain, Cape Town
**Verdict: Would use**

**Today:** Nothing. "You don't report. Everybody knows who reported."

**Would you use it?** "If it's really anonymous, yes. The gangs are shooting
in the day now, the kids are walking to school."

**How:** Report shootings and drug houses anonymously, in Afrikaans. She read
"Jou naam word nooit gestoor nie" twice.

**Missing:** Proof of anonymity. "Tell me also you don't keep my phone number
or where I was standing." (The photo resize strips GPS; the report's own GPS
location remains.) She wanted the option to drop the pin a street away.

---

### 19 — Luyolo Mpofu, 26, youth volunteer, community patrol, Khayelitsha
**Verdict: Maybe**

**Today:** Patrol WhatsApp group, street committee.

**Would you use it?** "Where's isiXhosa? This is Cape Town."

**How:** If isiXhosa were added he would roll it out to his patrol. He liked
the GPS button: "There are no street names in the informal section. The pin is
the only address."

**Missing:** isiXhosa. Location by landmark ("next to the container clinic").

---

### 20 — Marlene Fourie, 67, retired bookkeeper, Durbanville
**Verdict: Would use**

**Today:** Neighbourhood watch WhatsApp, private security panic button.

**Would you use it?** "Oh yes, I'm on everything."

**How:** Report suspicious people checking gates, loud parties, and broken
pavements. She would check the tracker for each report.

**Missing:** Larger text option. She struggled with the light-grey helper text.

---

### 21 — Siyabonga Cele, 30, graphic designer (Deaf), Pietermaritzburg
**Verdict: Would use**

**Today:** "I can't call 10111. I have to find a hearing person to call for
me. Sometimes there's nobody."

**Would you use it?** "Yes. This is the first time I can report myself."

**How:** Text report with photo; then watch the status tracker. "Acknowledged
means someone read it. That is enough for me to know."

**Missing:** The 10111 / 112 notice assumes the reader can phone. He asked for
an alternative for Deaf users in real emergencies, such as SMS to an emergency
number.

---

### 22 — Grace Mokoena, 48, administrator, screen-reader user, Pretoria
**Verdict: Maybe**

**Today:** Phones.

**Would you use it?** "If my screen reader can get through the form, yes.
Most apps I just give up."

**How:** Used the GPS button rather than typing a location. Liked that the
incident-type buttons read out clearly.

**Missing:** Confirmation that the report was sent must be announced to the
screen reader, not only shown. A full accessibility audit.

---

### 23 — Craig Jacobs, 42, estate manager, gated estate, Midrand
**Verdict: Maybe**

**Today:** Own access-control system and guard incident book.

**Would you use it?** "For outside the walls, maybe. Inside, we have our own
system."

**How:** His guards would report incidents on the perimeter road, such as
suspicious vehicles. He'd want to see incidents in a 2 km radius of the estate.

**Missing:** API or webhook so incidents flow into his security system.
Location-radius filtering.

---

### 24 — Nandi Buthelezi, 35, counsellor at a gender-based-violence NGO, Durban
**Verdict: Would not use (for her clients)**

**Today:** Referrals to the GBV Command Centre, SAPS family-violence units and
shelters.

**Would you use it?** "Not for GBV. A survivor's report must go to trained
people, not a community dashboard where a patroller might know the abuser."

**How:** She saw value for general neighbourhood safety but not her work.

**Missing:** If someone picks *other* and describes abuse, the app should
show GBV helpline details and not route it to community responders. She asked
that the AI detect this.

---

### 25 — Tumelo Sebego, 17, Grade 11 learner, Rustenburg
**Verdict: Would use**

**Today:** Tells friends. Never adults.

**Would you use it?** "If my parents don't find out and I don't need an
account, ja."

**How:** Report broken street lights and the dark path behind the shopping
centre on his walk home, anonymous.

**Missing:** Nothing; he liked that there's no sign-up. Wanted a dark mode.

---

### 26 — Willem Pretorius, 61, body-corporate chairperson, Bloemfontein
**Verdict: Would not use**

**Today:** Body-corporate WhatsApp group and the managing agent.

**Would you use it?** "Nee. I don't give my information to an AI. Where does
it go? Overseas? Who trains on it?"

**How:** N/A. Told that data stays in an AWS region in Cape Town and reporter
names are never shown on the dashboard, he softened slightly but still declined:
"Then show me the privacy policy. POPIA. In writing."

**Missing:** A plain-language privacy notice and POPIA statement linked from
the form.

---

### 27 — Precious Maseko, 28, night-shift nurse, Benoni
**Verdict: Would use**

**Today:** Shares her live location with her sister on the walk to the taxi.

**Would you use it?** "Yes. I walk past the same group of guys every night at
19:00."

**How:** Report suspicious activity at the same spot repeatedly, then check
the tracker. "If I see 'dispatched', at least I know the patrol is coming
past."

**Missing:** Notifications when status changes, so she doesn't have to keep the
page open.

---

### 28 — Andile Zwane, 40, tavern owner, KwaMashu, Durban
**Verdict: Maybe**

**Today:** Private security for his business. Ignores noise complaints.

**Would you use it?** "For robberies at my tavern, yes. But neighbours will use
it to report me for noise every Friday."

**How:** Report armed robberies and fights outside. He'd want to know he could
respond to complaints.

**Missing:** Fair process. Who decides a noise complaint is valid? He asked
whether repeated anonymous reports from one person would be spotted.

---

### 29 — Hlengiwe Shabalala, 46, community leader, informal settlement, Ekurhuleni
**Verdict: Would use**

**Today:** A whistle, a loud-hailer, and calling the fire department, who often
can't find the place.

**Would you use it?** "Shack fires. When one shack burns, 30 burn. If the fire
truck gets the exact pin, we save homes."

**How:** She and two committee members would report fires and illegal
electricity connections with GPS. She liked that the AI marks fire as critical.

**Missing:** Many residents only have basic phones. "Give us a USSD code, like
*120*…, then everyone can report."

---

### 30 — Rashid Ebrahim, 50, security manager, large shopping mall, Sandton
**Verdict: Would use**

**Today:** Radio network with 60 guards, CCTV room, mall WhatsApp.

**Would you use it?** "As a receiver, yes. Shoppers will report an unattended
bag here before they find a guard."

**How:** Control room watches a filtered view for the mall's address. The
sample "unattended bag at entrance B" incident was exactly the kind of thing
he wants first.

**Missing:** Geofence alert for incidents within the mall's footprint;
duplicate merging when 10 shoppers report the same thing.

---

### 31 — Mpho Radebe, 36, municipal call-centre agent, City of Tshwane
**Verdict: Would use**

**Today:** Logs calls into a ticket system by hand. Average call 6 minutes.

**Would you use it?** "The AI summary and category are what I spend the six
minutes typing."

**How:** Use the dashboard as an inbox, acknowledge, then forward to the right
department: electricity, roads, water.

**Missing:** Export or API to the municipal ticketing system; department
routing based on category.

---

### 32 — Ethan Kruger, 24, software developer, Sea Point, Cape Town
**Verdict: Maybe**

**Today:** Never reported anything.

**Would you use it?** "Maybe. I'd want to know how the AI decides. If it marks
my report low and someone else's high, why?"

**How:** He'd report car break-ins on his street. He tried to game the triage
with dramatic wording and wanted to know whether that works.

**Missing:** A visible reason for the severity ("high: weapon mentioned,
ongoing"). Protection against people exaggerating to jump the queue.

---

### 33 — Dineo Letsoalo, 32, hair-salon owner, Polokwane
**Verdict: Would use**

**Today:** Tells the shop next door, sometimes calls SAPS.

**Would you use it?** "Yes, during load-shedding the robbers come because the
alarms are off."

**How:** Photo of the suspects' car and number plate, report under theft.
She'd ask the other shop owners in the complex to use it.

**Missing:** Sepedi. "My customers are mostly Sepedi speakers. English is fine
for me, not for them."

---

### 34 — Bongani Hadebe, 63, retired SAPS detective, Pinetown
**Verdict: Maybe**

**Today:** Retired; gets calls from neighbours who trust him.

**Would you use it?** "It's good intelligence. But I've seen a crowd go burn a
man's house because of a WhatsApp rumour. Who checks these reports?"

**How:** He'd use the dashboard as a CPF volunteer to spot patterns, such as
the same car described in three reports.

**Missing:** Moderation before anything becomes public; an audit trail of who
changed a status; a reason for each AI severity so a human can disagree.

---

### 35 — Michelle Swart, 38, runner and cyclist, Centurion
**Verdict: Would use**

**Today:** Strava comments, the cycling club WhatsApp.

**Would you use it?** "Yes, for potholes and that intersection where the robot's
been out for a week."

**How:** Report infrastructure and traffic hazards with GPS mid-ride, then check
the map before choosing a route.

**Missing:** Public map; the ability to "+1" an existing report instead of
creating another.

---

### 36 — Tshepo Mabaso, 47, tow-truck operator, Germiston
**Verdict: Would use**

**Today:** Scanner apps and accident WhatsApp groups to be first on the scene.

**Would you use it?** "If I can see the traffic accidents on the map, every
day, all day."

**How:** He would watch the responder dashboard for traffic incidents.

**Missing (for the team):** This interview exposes a risk. The responder
dashboard is not access-controlled; anyone with the link sees every incident's
location. Responder views need logins and roles before deployment.

---

### 37 — Ntombi Ngcobo, 26, community-newspaper reporter, Durban
**Verdict: Maybe**

**Today:** SAPS media statements, community Facebook pages.

**Would you use it?** "For aggregated numbers, yes. 'Reports of cable theft up
40% in Ward 12', that's a story."

**How:** Read-only access to anonymised stats and the category breakdown.
She noted approvingly that reporter names are never exposed.

**Missing:** A public statistics page; a press contact.

---

### 38 — Hennie Venter, 53, farm-watch coordinator, Limpopo
**Verdict: Would not use**

**Today:** VHF radio network, 40 farms, a coordinated reaction plan.

**Would you use it?** "No signal on half the farms. And a farm attack is
minutes. Radio is instant, app is not."

**How:** N/A for urgent incidents. He might use the analytics if someone else
entered the data.

**Missing:** Offline capture that sends when signal returns; a way for a radio
control room to log incidents into the same system.

---

### 39 — Kelebogile Moagi, 30, campus protection officer, Potchefstroom
**Verdict: Would use**

**Today:** Campus hotline, residence wardens, a student safety app nobody
opens.

**Would you use it?** "Our current app needs a student login. Students don't
bother. Yours just works."

**How:** Run the dashboard in the campus control room, filter to campus
locations, dispatch foot patrols. Use the time-of-day heatmap to plan shuttle
routes.

**Missing:** Restrict to campus boundary; custom categories such as "student in
distress".

---

### 40 — Pastor Simon Mathebula, 66, church minister, Giyani, Limpopo
**Verdict: Maybe**

**Today:** Announcements after Sunday service; the induna (headman).

**Would you use it?** "Xitsonga, then I'll announce it from the pulpit."

**How:** He would encourage young members to report on behalf of elders: stock
theft, house break-ins while families are at funerals.

**Missing:** Xitsonga. Village locations without street names; a way to
describe "the house next to the old school".

---

### 41 — Yusuf Davids, 29, holiday-rental host, Bo-Kaap, Cape Town
**Verdict: Would use**

**Today:** Warns guests verbally about where not to walk.

**Would you use it?** "Yes, and I'd put the link in my welcome book."

**How:** Guests report muggings or phone snatches in English; he checks the map
before recommending walking routes.

**Missing:** A tourist-friendly mode with an explanation of local emergency
numbers.

---

### 42 — Palesa Khoza, 23, call-centre agent and single mother, Alexandra
**Verdict: Would use**

**Today:** Complains to neighbours.

**Would you use it?** "Yes, anonymous. The illegal connections next to the
crèche are going to kill a child."

**How:** Report illegal electricity connections and illegal dumping under
infrastructure, with a photo.

**Missing:** An "illegal dumping" category; visible progress, because "these
things take months to fix."

---

### 43 — Gerhard Nel, 44, insurance claims assessor, Pretoria
**Verdict: Maybe**

**Today:** Requires a SAPS case number for theft claims.

**Would you use it?** "As supporting evidence, maybe. A timestamped report with
a photo the same night helps a claim."

**How:** Clients would report a break-in and share the reference with the
insurer alongside the SAPS case number.

**Missing:** A visible reference number and a shareable, tamper-evident copy of
the report.

---

### 44 — Lindiwe Mabuza, 37, disaster-management officer, eThekwini
**Verdict: Would use**

**Today:** Call centre, ward councillors, social media during floods.

**Would you use it?** "In the 2022 floods we had no live picture. Residents
reporting with GPS and photos would have helped us prioritise rescues."

**How:** Watch the live map during severe weather; use the priority queue to
dispatch rescue teams.

**Missing:** "Flood / severe weather" category; ability to broadcast a
warning to people who recently reported in an area.

---

### 45 — Jabulani Mnisi, 58, security guard at a block of flats, Hillbrow
**Verdict: Would use**

**Today:** Phone, when he has airtime. Often he doesn't.

**Would you use it?** "Free Wi-Fi at the corner works. Phone calls cost money."

**How:** Report fights, robberies and suspicious people around the building
using public Wi-Fi.

**Missing:** Save the report if Wi-Fi drops and send it later. Confirmation
that it went through.

---

### 46 — Amahle Gumede, 19, content creator, Durban
**Verdict: Would not use**

**Today:** Posts videos to TikTok and Instagram.

**Would you use it?** "Nobody responds anyway. If I post it, 200 000 people
see it and then the police come because it's embarrassing."

**How:** N/A.

**Missing:** Proof that reports lead to action. Public "resolved" stats might
change her mind: "Show me 'resolved in 20 minutes' and I'll try it."

---

### 47 — Brian Moyo, 35, welder, Cosmo City
**Verdict: Maybe**

**Today:** Avoids police.

**Would you use it?** "Anonymous, okay. But if I report and police come to ask
questions, they ask for my papers."

**How:** Report house break-ins in his section and the dark open field people
are robbed in.

**Missing:** A clear statement that anonymous really means no follow-up
contact, and who receives the report.

---

### 48 — Elsabé Jacobs, 55, librarian, Worcester, Western Cape
**Verdict: Would use**

**Today:** Emails the municipality; rarely hears back.

**Would you use it?** "Ja, in Afrikaans, lekker."

**How:** Report vandalism of the library and the broken lights in the parking
lot, with photos; check the tracker.

**Missing:** Nothing major. Wants to see her past reports in one place.

---

### 49 — Sizwe Ntuli, 43, metro traffic officer, Johannesburg
**Verdict: Would use**

**Today:** Radio and the traffic control centre.

**Would you use it?** "Traffic lights out at William Nicol at peak hour is
critical, and your AI got that right."

**How:** Watch the queue filtered to *traffic*, dispatch pointsmen to dead
intersections first.

**Missing:** Merging duplicates (five reports for the same intersection should
be one incident with five confirmations) and auto-resolve once lights are
restored.

---

### 50 — Rose Lekota, 80, retired teacher, Kimberley
**Verdict: Would not use**

**Today:** Her neighbour, her church, her landline.

**Would you use it?** "I have a phone with buttons. No internet on it."

**How:** N/A.

**Missing:** USSD or SMS reporting. "If I can buy electricity with *130*, I can
report a crime with it."
