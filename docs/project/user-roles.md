# User Roles and Authorization Model

## Authorization principles

- A user may hold multiple roles.
- Farm roles are assignments scoped to a specific farm, not global permissions.
- Backend checks must enforce authentication, role, farm membership, ownership, record state, and veterinarian assignment; hiding UI controls is insufficient.
- Least privilege applies to APIs, private files, reports, dashboards, and chat.
- Public certificate verification is a narrow unauthenticated capability with deliberately limited fields.

## PLATFORM_ADMIN

Represents the dairy/cooperative/platform operator. May administer users, monitor farms, review veterinarian submissions, approve/reject/suspend veterinarians, govern cited reference data, resolve review cases, monitor AMU/withdrawal/certificates/blockchain anchors, and inspect authorized audit and platform reports. It does not inherently represent a regulator and should not routinely create every farm.

## FARM_OWNER

May create and manage a farm, maintain its profile, add livestock, invite/remove farm users, assign permitted roles, request veterinary care, participate in authorized cases, view treatments and withdrawal/eligibility status, access certificates, and use farm AMU analytics and reports.

An owner may also be assigned `FARM_MANAGER`.

## FARM_MANAGER

May perform configured operational and management activities on behalf of the owner, including livestock management, veterinary requests, case participation, treatment oversight, and farm dashboards/reports. Destructive membership or ownership actions may remain owner-only according to the eventual permission matrix.

## FARM_WORKER

Has restricted, explicitly granted operational permissions, such as viewing assigned animals, recording observations, and recording an authorized treatment administration. A worker cannot independently diagnose, prescribe, verify veterinarians, manage reference rules, or access unrelated farm/private records.

## VETERINARIAN

Registers through a separate profile and credential workflow. Only a veterinarian in `VERIFIED` status may appear in normal discovery, accept an assigned treatment request, record an official diagnosis, or issue a prescription. The assigned veterinarian may communicate within the case and manage permitted clinical records. `PENDING`, `REJECTED`, or `SUSPENDED` profiles cannot exercise verified-clinical privileges.

## Public/authorized certificate verifier

May follow a QR verification identifier and see only approved certificate facts such as certificate number, suitable animal identifier, farm name where allowed, dates, current status, and blockchain verification state. The verifier must not receive veterinarian documents, chat, full treatment/medical history, farmer personal data, or unnecessary identifiers.

## Future role

A read-only regulator role may be evaluated later but is outside the initial MVP and must not be conflated with `PLATFORM_ADMIN`.

## High-level permission constraints

| Action                         |              Admin |     Owner/Manager |        Worker |                  Verified vet | Public verifier |
| ------------------------------ | -----------------: | ----------------: | ------------: | ----------------------------: | --------------: |
| Verify veterinarian submission |                Yes |                No |            No |                            No |              No |
| Manage own farm/animals        | Monitor/configured |               Yes |       Limited |                            No |              No |
| Create treatment request       |                 No |               Yes | If authorized |                            No |              No |
| Accept assigned request        |                 No |                No |            No |                           Yes |              No |
| Diagnose/prescribe             |                 No |                No |            No |                           Yes |              No |
| Record administration          |             Review | Yes if authorized | If authorized |             Yes if authorized |              No |
| Govern reference data          |                Yes |                No |            No | Review input only if designed |              No |
| View farm AMU                  |     Platform scope |        Farm scope |       Limited |                Relevant scope |              No |
| Verify certificate summary     |                Yes |               Yes |       Limited |                      Relevant |             Yes |

The detailed permission matrix, separation-of-duty rules, and record-state guards will be finalized during architecture design.
