# Dairy-Relevant Diseases and Conditions

The six condition groups below are selected for structured clinical recording and AMU breakdowns. They are **not automatic diagnoses or treatment recommendations**.

| ID                       | Condition                                      | Why included                                                           | Antimicrobial relevance                                                          |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `COND-MASTITIS-CLINICAL` | Clinical bovine mastitis                       | Directly affects milk and commonly uses intramammary/systemic products | Core demo condition; veterinarian decides therapy                                |
| `COND-METRITIS`          | Postpartum metritis/endometritis               | Important reproductive bacterial condition in dairy animals            | May require systemic/intrauterine treatment under veterinary judgment            |
| `COND-BRD`               | Bovine bacterial respiratory disease/pneumonia | Common systemic infectious syndrome                                    | Useful for injectable-route AMU                                                  |
| `COND-FOOTROT`           | Interdigital necrobacillosis/foot rot          | Common painful bacterial condition                                     | Useful for systemic therapy and course tracking                                  |
| `COND-HS`                | Haemorrhagic septicaemia                       | Important bovine bacterial disease in India                            | Outbreak/urgent clinical context; prevention and veterinary control are critical |
| `COND-CALF-ENTERIC`      | Calf bacterial enteritis/septicaemia           | Relevant young-stock condition                                         | Antimicrobials only when bacterial/systemic involvement is assessed              |

DAHD's Standard Veterinary Treatment Guidelines are the principal condition source. Its mastitis section emphasizes hygiene and veterinarian-directed treatment; it mentions beta-lactams, enrofloxacin, and intramammary products but does not justify automated selection.

FMD and brucellosis are recorded in the wider disease architecture but excluded from the antimicrobial demo list: FMD is viral, and DAHD's NADCP states there is no bovine brucellosis treatment and focuses on vaccination. The application must not imply antibiotics are indicated for either.

## Required disease fields

Canonical ID/name, aliases, affected species, syndrome/body system, infectious/etiology category, antimicrobial relevance (`POSSIBLE`, `NOT_INDICATED`, `VET_ASSESSMENT`), source IDs, verification state, and notes/limitations.
