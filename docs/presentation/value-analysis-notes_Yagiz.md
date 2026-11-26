# Value analysis: speaker notes (about 60 seconds)

Presenter: Yağız Asker (Value/Finance Analyst, presentation of 5.11).
Source of every number: `docs/report/5.11_operating-costs_Mert.md` and the workbook
`docs/report/5.11_cost-benefit-workbook_Mert.xlsx`. If a number changes there, change it here.
Figures as of 26 Nov 2026 (eight team members, provisional join date 26 Nov).

## Slides (use the template layouts)

| # | Layout | Title (states the main idea) | Content |
|---|---|---|---|
| 1 | Cards | What it costs, what it returns | Card 1: **77,211 TL** development (432 h of team time). Card 2: **61,791 TL/year** paid hosting and support. Card 3: **116,175 TL/year** staff time freed (650 h) |
| 2 | Content with a key number | The value is positive, but thin | Big number **+13,799 TL** (NPV, 3 years, 36%). Points: payback 1.4 years (2.4 discounted); discounted ROI 7.6% |
| 3 | Content with a key number | One number decides it | Big number **9.3 min**. Points: below this, NPV is negative; 8 min: −25,085 TL, 10 min: +13,799 TL; the survey must measure it |

## Speech (Turkish)

Merhaba, ben Yağız. Değer analizini ben sunuyorum.

CampusSlot'u yapmanın bize maliyeti yaklaşık 77 bin lira: 432 saatlik ekip emeği, asgari ücret işveren maliyetiyle hesaplandı. Ücretli sunucuyla çalıştırmak yılda yaklaşık 62 bin lira.

Karşılığında ne kazanıyoruz? Rezervasyonlar artık personel eliyle yapılmıyor. Yılda 3.900 rezervasyon ve her biri için 10 dakika varsayımıyla 650 personel saati boşa çıkıyor, bu yılda yaklaşık 116 bin lira ediyor.

Merkez Bankası politika faizi olan yüzde 36 ile üç yıllık hesapta net bugünkü değer pozitif: yaklaşık 14 bin lira. Geri ödeme 1,4 yıl, iskontolu 2,4 yıl.

Dürüst bir not: sonuç tek bir sayıya bağlı, bugün bir rezervasyonun kaç dakika sürdüğü. Yaklaşık 9 dakikanın altında proje kendini ödemiyor. Bu yüzden anketle ölçüyoruz.

Özet: sonuç pozitif ama ince, ve neyin onu değiştireceğini açıkça gösteriyoruz.

## Speech (English)

Hi, I'm Yağız, and I'll present the value analysis.

Building CampusSlot costs about 77 thousand lira in team time: 432 hours, valued at the minimum-wage employer rate. Running it on paid hosting costs about 62 thousand lira a year.

What do we get back? Bookings are no longer handled by hand. At 3,900 bookings a year and 10 minutes each, that frees 650 staff hours, worth about 116 thousand lira a year.

Discounted at 36 percent, the central bank policy rate, over three years, the net present value is positive, about 14 thousand lira. Payback is 1.4 years, or 2.4 with discounting.

One honest point: the result rests on one number, how many minutes a manual booking takes today. Below about 9 minutes, the project does not pay back. That is why our survey measures it.

So: positive, but thin, and we show exactly what could change it.

## Likely questions

| Question | Answer |
|---|---|
| Is this real money? | No cash comes in. The benefit is staff time that is freed. It becomes a saving only if the university uses that time elsewhere or avoids a hire (5.11.12). |
| Why 77 thousand lira for unpaid students? | The team is unpaid, so the effort is an opportunity cost, valued at the minimum-wage employer cost, which is a lower bound (C4, C17). |
| Where does 10 minutes come from? | It is our proposal, not a measurement (C15). That is why there is a sensitivity table: 8 minutes gives a negative NPV, 10 gives a positive one. |
| Why a 36% discount rate? | The TCMB one-week repo rate set on 22 Oct 2026, effective 23 Oct (5.11.4). It has no project-risk premium. |
| Why paid hosting as the base case? | The free tiers do not allow production use (C8), so the paid scenario is the realistic one. With free tiers the NPV would be higher. |
| Why only 3 years? | At 36% the discount factors shrink fast, so years 4 and 5 add little (C18). |

## Before presenting, Yağız must be able to

1. Recompute the NPV himself from the table in 5.11.8: −77,211.36 + 54,383.40 × 1.673494 = +13,798.92.
2. Say what the 9.3-minute break-even means and where it comes from (5.11.13).
3. Open the workbook and change "Minutes per booking" to see the NPV move.
