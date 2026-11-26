# Appendix B – Interview Guides (Instrument)

Fact-finding technique: semi-structured interview
Number of interviews: 2 (plus one optional)
- INT-01: Laboratory staff member responsible for lab and equipment bookings (current manual process; main target of CampusSlot)
- INT-02: Library staff member responsible for the library's existing room booking system (an existing solution on our own campus)
- INT-03 (optional): Administrative staff member who handles classroom/room requests (e.g., department secretary). Used only if time allows or if INT-01 or INT-02 cannot be held.

Planned length: 20–30 minutes each
Language: Turkish (questions below are given in Turkish with an English translation)
Interviewer: Zeynep [surname TBD]

---

## 1. Opening script (read before each interview)

**TR:** Merhaba, ben Zeynep. SWE307 dersinde kampüste derslik, laboratuvar ve ekipman rezervasyonu için bir web uygulaması tasarlıyoruz. Bugünkü süreci sizden dinlemek istiyorum. Görüşme 20–30 dakika sürecek. Notlar yalnızca ders projesinde kullanılacak; raporda adınız değil, yalnızca görev unvanınız yer alacak. İsterseniz herhangi bir soruyu atlayabilirsiniz. Not almamda bir sakınca var mı? Ses kaydı almamı kabul eder misiniz? (Kabul etmezseniz yalnızca yazılı not alacağım.)

**EN:** Hello, I am Zeynep. In the SWE307 course we are designing a web application for reserving classrooms, laboratories and equipment on campus. I would like to hear how the current process works. The interview takes 20–30 minutes. The notes are used only for this course project; the report will mention your job title, not your name. You may skip any question. Is it all right if I take notes? Do you agree to an audio recording? (If not, I will take written notes only.)

---

## 2. INT-01 – Laboratory staff (lab and equipment bookings)

| No. | Question (Turkish) | English translation | Purpose |
|---|---|---|---|
| L1 | Laboratuvar ve ekipman ayırma işi bugün nasıl yapılıyor? Bir talep geldiği andan kullanım bitene kadar adım adım anlatır mısınız? | How are lab and equipment bookings handled today? Could you describe the steps from the moment a request arrives until the use ends? | Current process (DFD, Fishbone *Process*) |
| L2 | Haftada yaklaşık kaç ayırma ya da ödünç talebi geliyor? Bu talepler hangi kanallardan geliyor (e-posta, yüz yüze, kâğıt, mesaj)? | Roughly how many booking or loan requests do you receive per week, and through which channels (e-mail, in person, paper, messaging)? | Volume, channels (5.11 input) |
| L3 | Bu talepleri işlemek size haftada ne kadar zaman alıyor? | How much of your time per week goes into handling these requests? | Staff time (5.11 benefit input) |
| L4 | Ayrılıp kullanılmayan, yani kimsenin gelmediği lab saatleriyle ne sıklıkla karşılaşıyorsunuz? Yakın zamandan bir örnek verebilir misiniz? | How often do you see lab slots that were booked but nobody came? Can you give a recent example? | No-show evidence (R8) |
| L5 | Çakışan ya da aynı saate iki kez yapılan ayırmalar oluyor mu? Olduğunda nasıl çözülüyor? | Do double or overlapping bookings happen? How are they resolved? | Conflict rule (R3) |
| L6 | Ekipman ödünç verirken hangi kontrolleri yapıyorsunuz (kim alıyor, ne kadar süreyle, iade)? Bir onay adımı var mı, onayı kim veriyor? | What checks do you make when lending equipment (who borrows, for how long, return)? Is there an approval step, and who approves? | Equipment approval (R5, F7) |
| L7 | Kayıtlar nerede tutuluyor (kâğıt, Excel, e-posta)? Doluluk ya da gelmeme (no-show) sayısını ölçen bir kayıt var mı? | Where are records kept (paper, Excel, e-mail)? Is utilisation or no-show data recorded anywhere? | Fishbone *Measurement*; reports (F8) |
| L8 | Gelmeyen ya da ekipmanı geç iade eden kullanıcılar için bir kural ya da yaptırım var mı? Sizce nasıl olmalı? | Is there any rule or sanction for users who do not show up or return equipment late? What do you think it should be? | Penalty rule (R9) |
| L9 | Bir ayırmanın süresi ya da kişi başına ayırma sayısı için bir sınır var mı? En fazla 3 saat ve öğrenci başına aynı anda en fazla 2 aktif ayırma sınırı size makul geliyor mu? | Is there a limit on booking length or on the number of bookings per person? Do a 3-hour maximum and at most 2 active bookings per student sound reasonable? | Validate R1, R2 |
| L10 | Kapıdaki QR kodla giriş (check-in) yapılan ve gelinmeyen ayırmayı 15 dakika sonra otomatik iptal eden bir sistem işinizi nasıl etkiler? En çok hangi rapor ya da özellik işinize yarar? | How would a system with QR check-in at the door and automatic release of no-shows after 15 minutes affect your work? Which report or feature would help you most? | Validate R7, R8; admin needs (F8) |

**Closing:** Eklemek istediğiniz bir şey var mı? Kullandığınız bir form, liste ya da e-posta şablonu varsa (kişisel bilgiler kapatılmış olarak) inceleme için paylaşabilir misiniz? / Is there anything you would like to add? Could you share any form, list or e-mail template you use (with personal data removed) for our document review?

---

## 3. INT-02 – Library staff (existing room booking system)

Context: the university library already uses an online system for booking study rooms ([TBD: name of the system]). This interview studies that system as an existing solution on our own campus: what it covers, how it handles check-in and no-shows, what it does not do, and what it changed for the staff. The findings feed 5.2 (scope), 5.3 (existing solutions, shared with Arzum), 5.4 (requirements) and 5.11 (benefit figures).

| No. | Question (Turkish) | English translation | Purpose |
|---|---|---|---|
| K1 | Kütüphanede çalışma odası rezervasyonu için hangi sistemi kullanıyorsunuz? Ne zamandan beri kullanılıyor? Hangi kaynaklar bu sistemde (çalışma odaları, bilgisayarlar, ekipman)? | Which system does the library use for study room bookings? Since when? Which resources are in it (study rooms, computers, equipment)? | Existing solution; 5.2 scope; 5.3 market comparison |
| K2 | Bir öğrenci rezervasyonu baştan sona nasıl yapıyor? Süre sınırı ya da kişi başı rezervasyon sınırı var mı? | How does a student make a booking from start to end? Is there a time limit or a limit per person? | Compare with R1, R2; DFD |
| K3 | Öğrenci odaya geldiğini nasıl bildiriyor (QR, kod, kart, personele söyleme)? Giriş için bir zaman aralığı var mı? | How does a student confirm that they have arrived (QR, code, card, telling staff)? Is there a time window for check-in? | Compare with R7, F5 |
| K4 | Rezervasyon yapıp gelmeyen öğrencinin rezervasyonuna ne oluyor? Oda otomatik olarak başkasına açılıyor mu, kaç dakika sonra? | What happens to the booking of a student who does not show up? Is the room released automatically, and after how many minutes? | Compare with R8 |
| K5 | Sık sık gelmeyen öğrenciler için bir ceza ya da rezervasyon yasağı var mı? Yoksa, neden yok? Sizce olmalı mı? | Is there a penalty or booking ban for students who often do not show up? If not, why not? Should there be one? | Validate R9; difference from CampusSlot |
| K6 | Sistemden önce bu iş nasıl yapılıyordu? Sistem size ne kadar zaman kazandırdı? O dönemde tek bir rezervasyonu işlemek kaç dakikanızı alıyordu? | How was this done before the system? How much time did the system save you? Back then, how many minutes did handling one booking take? | 5.11 C15 (before/after evidence for staff time) |
| K7 | Sistem rapor ya da istatistik veriyor mu (doluluk, gelmeme oranı)? Bu rakamları paylaşabilir misiniz? | Does the system give reports or statistics (occupancy, no-show rate)? Could you share these figures? | 5.11 C14, C16; F8 reports |
| K8 | Sistemin en çok şikâyet edilen ya da eksik bulduğunuz yanı ne? Öğrenciler en çok neyi soruyor? | What is the most common complaint about the system, or what do you find missing? What do students ask about most? | Pain points; FR and NFR candidates |
| K9 | Bölümlerdeki derslikler, laboratuvarlar ya da ekipman bu sisteme dahil mi? Değilse, neden? | Are department classrooms, laboratories or equipment included in this system? If not, why not? | 5.2 scope; the gap CampusSlot fills |
| K10 | Sistem öğrenciden hangi kişisel bilgileri alıyor ve bunlar ne kadar süre saklanıyor? Bir aydınlatma metni var mı? | Which personal data does the system collect from students, and how long is it kept? Is there a privacy notice? | NFR privacy; KVKK (5.8.5); document review DOC-09 |

**Note for N1–N5 (Section 5):** the library's process is already online, so ask N3 about the time *before* the system (see K6), and N2/N4 from the system's statistics (see K7) if available.

**Closing:** same as INT-01. Ask in particular for a screenshot or user guide of the booking system and any usage statistics (personal data removed). These go to Appendix D as DOC-08.

---

## 4. INT-03 (optional) – Administrative staff (classroom/room requests)

| No. | Question (Turkish) | English translation | Purpose |
|---|---|---|---|
| D1 | Derslik ya da toplantı odası ayırma işi bugün nasıl yürüyor? Bir talebin baştan sona izlediği yolu anlatır mısınız? | How does classroom or meeting room booking work today? Could you describe the path a request follows from start to end? | Current process (DFD) |
| D2 | Talepler hangi kanallardan geliyor? Yılın ya da haftanın hangi dönemlerinde yoğunlaşıyor? | Through which channels do requests come in? When are the busiest periods of the term or week? | Channels, peak load (NFR performance) |
| D3 | Haftada ortalama kaç talep işliyorsunuz ve bir talep size ortalama kaç dakikanızı alıyor? | On average, how many requests do you handle per week, and how many minutes does one request take? | Staff time (5.11 benefit input) |
| D4 | Hangi dersliğin hangi saatte boş olduğunu nasıl takip ediyorsunuz? Herkesin görebildiği güncel bir takvim var mı? | How do you track which room is free at which time? Is there an up-to-date calendar that everyone can see? | Availability calendar (F2); Fishbone *Technology* |
| D5 | Ayrılıp kullanılmayan derslikler fark ediliyor mu? Fark edilirse bu bilgi kime ve nasıl ulaşıyor? | Are booked-but-unused rooms noticed? If so, who learns about it and how? | No-show visibility (R8, *Measurement*) |
| D6 | Öğrencilerin ve akademik personelin talepleri arasında öncelik ya da farklı kurallar var mı? | Are there priorities or different rules for students and for academic staff? | Role-based limits (R2) |
| D7 | İptaller nasıl bildiriliyor? Son dakika iptali ya da hiç bildirilmeyen iptaller sık oluyor mu? | How are cancellations reported? Are last-minute or unreported cancellations common? | Cancellation (R6, F4) |
| D8 | Bu konuda en sık hangi şikâyetleri ya da soruları alıyorsunuz? | What complaints or questions do you receive most often about this? | Pain points (5.2 problem statement) |
| D9 | Derslik ve kaynak kullanımıyla ilgili yazılı bir yönerge, kural ya da duyuru var mı? Paylaşabilir misiniz? | Is there a written directive, rule or notice on room and resource use? Could you share it? | Fishbone *Policy*; document review |
| D10 | Online bir sistemde sizin için olmazsa olmaz üç özellik ne olurdu? Öğrenci adı ya da numarası gibi kişisel veriler için dikkat edilmesi gereken bir kural var mı? | What three features would be essential for you in an online system? Are there rules we must follow for personal data such as student names or IDs? | FR priority; NFR privacy/KVKK |

**Closing:** same as INT-01.

---

## 5. Numbers the team needs (ask in both interviews if not already answered)

Other sections depend on these figures. If the interviewee gives a range ("5–10"), write the range; if they do not know, write "not known". Never fill in a guess.

| No. | Question (Turkish) | English translation | Needed for |
|---|---|---|---|
| N1 | Sorumlu olduğunuz kaç derslik, laboratuvar ve ödünç verilen ekipman var? (türüne göre sayı) | How many rooms, labs and loanable equipment items are you responsible for? (count by type) | 5.11 C13 (pilot scale) |
| N2 | Bir derslik / lab / ekipman için haftada ortalama kaç ayırma ya da ödünç talebi geliyor? | On average, how many booking or loan requests does one room / lab / equipment item get per week? | 5.11 C14 (booking volume) |
| N3 | Tek bir talebi baştan sona işlemek (talebi almak, takvime bakmak, onaylamak, kaydetmek) size kaç dakika sürüyor? | How many minutes does it take you to handle one request from start to end (receive, check the calendar, confirm, record)? | 5.11 C15 (decisive parameter; NPV changes sign between 8 and 10 minutes) |
| N4 | Yapılan ayırmaların yaklaşık yüzde kaçında kimse gelmiyor? | Roughly what percentage of bookings end with nobody showing up? | 5.11 C16 (no-show rate) |
| N5 | Derslikler ve lablar günün hangi saatleri arasında kullanıma açık? Hafta sonu açık mı? | Between which hours of the day are rooms and labs open for use? Are they open at weekends? | HANDOFFS H08 (occupancy rate in the usage report) |
| N6 | Rezervasyon ve ödünç işlerine (talepleri almak, takvim tutmak, onaylamak, kayıt) haftada toplam kaç saat ayırıyorsunuz? | In total, how many hours a week do you spend on booking and loan work (receiving requests, keeping the calendar, approving, recording)? | 5.11 C15 (cross-check of N2 × N3) |

**Team questions on rule R9 (HANDOFFS H09).** Ask for the interviewee's view; the final rule is decided by the team with this view as evidence.

| No. | Question (Turkish) | English translation | Needed for |
|---|---|---|---|
| P1 | Bir öğrenci 30 gün içinde 3 kez gelmeyip 7 gün yasak aldıysa, yasak bittikten sonra bu 3 gelmeme bir sonraki yasak için tekrar sayılmalı mı, yoksa sayaç sıfırlanmalı mı? | If a student got a 7-day ban for 3 no-shows in 30 days, should those 3 no-shows count again towards the next ban after the ban ends, or should the count start from zero? | H09 (a) |
| P2 | "Son 30 gün" sizce rezervasyonun başlangıç saatinden mi, yoksa gelmeme kaydının düştüğü andan mı sayılmalı? | Should "the last 30 days" be counted from the start time of the reservation, or from the moment the no-show was recorded? | H09 (b) |

## 6. Interview record template (one copy per interview)

| Field | Value |
|---|---|
| Interview ID | INT-01 / INT-02 / INT-03 |
| Date and time | [TBD] |
| Place / mode | [TBD: face to face / online] |
| Interviewee role (no name) | [TBD] |
| Interviewer | Zeynep |
| Consent to notes / audio | [Yes/No] / [Yes/No] |
| Duration | [TBD] minutes |

**Answers:** one short paragraph per question (L1–L10 or D1–D10). Write what the person said; mark direct quotes with quotation marks.

**Key findings (3–5 bullet points):** [TBD]

**Numbers and team questions (Section 5):** N1 [TBD] · N2 [TBD] · N3 [TBD] · N4 [TBD] · N5 [TBD] · N6 [TBD] · P1 [TBD] · P2 [TBD]

**Documents obtained:** list with DOC IDs from Appendix D. [TBD]

**Follow-up questions:** [TBD]

Raw notes and any audio recording stay in the team's private shared folder. Only the anonymised summary goes into the report and this repository.
