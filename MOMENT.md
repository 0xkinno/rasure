# MOMENT

Persona (fictional, labelled so in the UI and README): **Meera Kulkarni**, night dispatcher for a network of volunteer drivers that takes survivors of domestic violence from a pickup landmark to a shelter or a One Stop Centre, in Pune, India. The same model applies to shelter transport anywhere.

## 23:40

Rides are posted between 20:00 and 02:00 for pickups within hours. At 23:40 a volunteer driver's phone is taken by the abuser of the woman she just drove. Everything that phone can read about past pickups is now in the wrong hands. One exposed pickup history can reveal where a survivor was taken.

## Sources (each opened on 2026-10-18; one short phrase quoted at most)

| Claim | Source | Confirmed |
|---|---|---|
| US victim service providers may not disclose personally identifying information of the people they serve | [34 U.S.C. 12291, subsection (b)(2)(B) "Nondisclosure"](https://www.law.cornell.edu/uscode/text/34/12291) | Yes. The text bars grantees from disclosing "personally identifying information". |
| Victim service providers cannot put client-level data into the shared homeless management database | [NNEDV Safety Net, Comparable Database 101](https://www.techsafety.org/comparable-database-101) | Yes. The page says providers "cannot input client-level information" into the shared system and use a separate comparable database. |
| Technology and abuse are a documented safety problem for advocates | [NNEDV Safety Net](https://www.techsafety.org/) | Yes, as a resource hub. The page says it "focuses on the intersection of technology and abuse". The specific claim that abusers monitor phones was not found on that page, so it is not made here. |
| Femicide scale: women and girls killed by intimate partners or family members | [UN release of 25 November 2025](https://turkiye.un.org/en/node/306761) | Yes. It cites about 51,100 for 2023. A later estimate of about 50,000 for 2024 appeared in search results but its primary page was not opened, so it is not cited. |
| India: One Stop Centres and the 181 Women Helpline under Mission Shakti | [PIB factsheet on Mission Shakti](https://pib.gov.in/FactsheetDetails.aspx?Id=149109) | Found through search (summary of the factsheet); the wcd.gov.in pages themselves were not opened, so no figure from them is used. |

## Dropped

- **NFHS-5 spousal violence share (about 29 percent).** The official fact sheet could not be opened. Secondary sources disagree (29, 31 and 32 percent depending on definition). Dropped under the rule "if a figure cannot be confirmed, drop it".

## The legal anchor

The law already tells shelters that survivor data must not sit in a shared database. Rasure is a shared board that holds nothing readable after it matters.

## Assumption versus reality

Everyone building on Arkiv assumes an expired entity is gone. In reality its payload lives in the creation transaction, and history queries return it inside the node's retention window. See DISCOVERY.md.

## What we measure for "expose as little user data as possible"

Three generated numbers in `docs/FACTS.json`: public attributes per entity (target 6 or fewer, none naming a person or place), past records exposed after seizure (target 0), and plaintext bytes in any Rasure creation transaction (target 0).
