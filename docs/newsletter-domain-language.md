# Along the lake Domain

## Business Domain

A business domain defines a company’s main area of activity, the core service provided to clients. A company may have different business domains.

**ATL**
`Business Domain`: Local Media & Community Information

`Business Goal`: Help residents discover local events, businesses, and experiences in Clarkson, Lorne Park, Port Credit, and Lakeview through a weekly newsletter.

---

## Subdomain

A subdomain is a specific area of business activity that helps a company achieve its goals.
A business consists of multiple subdomains working together. Each has a different responsibility, but all contribute to delivering value to customers.

**ATL**: A local newsletter business needs to discover events, create content, publish newsletters, attract subscribers, and generate revenue.

### Types of subdomains

#### Core subdomain

A core subdomain is the part of the business that makes business special and differentiate it from other competitors. It does not have to be software. It can be your knowledge, process, relationships, data, brand, expertise or a unique way of doing something.

**ATL**: Local Discovery & Curation
Finding, filtering, understanding, and selecting the most relevant local events, businesses, places, and experiences for residents.
Example:
Newsletter A simply lists 40 events.
Along the Lake says:
"If you have young kids, these are the 3 events worth considering this weekend. If you want a date night, try this new place in Port Credit. And this small waterfront event isn't showing up on the usual event websites."

#### Generic subdomain

Business activities that all companies perform in the same way. Usually companies buy it or use an existing solution. Examples: Email delivery solution, payments platform, authentication.

**ATL**: Newsletter delivery using Beehiv; sending emails via sendgrid or use nodemailer, Oauth solution for authentication.

#### Supporting subdomain

A business capability needed to support the core business, but which does not itself provide a competitive advantage. It is usually specific to how the business operates and tends to contain simpler business rules than the core subdomain.

**ATL**:

- Content acquisition : Fetch and preserve material from local sources
- Candidate extraction : Convert page content into structured possibilities


#### ATL List of subdomain

| Subdomain | Purpose | Classification |
|---|---|---|
| Local discovery & editorial curation | Find interesting local opportunities and decide what is relevant, trustworthy, and worth recommending | **Core** |
| Content acquisition | Fetch and preserve material from local websites, event pages, feeds, and other sources | **Supporting** |
| Candidate extraction | Convert acquired content into structured event, business, place, or experience candidates | **Supporting** |
| Content catalog | Store and manage discovered events, businesses, places, and experiences | **Supporting** |
| Editorial workflow | Review, approve, reject, enrich, and prepare candidates for publication | **Supporting** |
| Newsletter production | Assemble approved content into a coherent weekly issue | **Supporting** |
| Subscriber management | Manage subscribers, preferences, subscriptions, and unsubscribe requests | **Generic** |
| Newsletter delivery | Send the finished newsletter reliably to subscribers | **Generic** |
| Authentication & authorization | Authenticate administrators and control access to internal tools | **Generic** |
| AI summarization | Generate draft summaries or descriptions while leaving editorial decisions to the editor | **Generic / Supporting capability** |
| Analytics | Measure newsletter opens, clicks, content engagement, and subscriber growth | **Generic / Supporting** |
| Local partnerships | Manage relationships with businesses, organizers, and community groups | **Supporting initially; potentially Core later** |

## 6. Ubiquitous Language

Use these terms consistently when discussing the domain and, where appropriate, in code, APIs, database models, Jira tickets, and documentation.

The vocabulary may be scoped to a particular bounded context rather than shared by the entire system.

| Term | Definition |
|---|---|
| Source | A local information source monitored for potentially relevant content, such as a website or feed |
| Crawl run | One attempt to retrieve content from one or more sources |
| Crawled page | The stable identity of a discovered web page, normally identified by its canonical URL |
| Page snapshot | The content retrieved from a crawled page at a particular point in time |
| Candidate | A discovered event, place, business, or experience that may be worth publishing but has not yet received an editorial decision |
| Provenance | Evidence describing where a candidate came from, including its source and supporting snapshot |
| Category | An editorial classification used to organize content, such as Events, Food, or Hidden Gems |
| Neighbourhood | The local area associated with content, such as Clarkson, Lorne Park, Port Credit, or Lakeview |
| Event | A time-bound local occurrence that may be considered for publication |
| Venue | The physical place where an event or experience takes place |
| Organizer | A person, business, or organization responsible for running an event |
| Editorial decision | The decision to approve, reject, or request further review of a candidate |
| Approved candidate | A candidate that has been accepted by the editor and can be used in newsletter production |
| Newsletter issue | A weekly edition of Along the Lake being prepared for publication |
| Issue section | A named grouping of content within a newsletter issue, such as Events, Food, or Hidden Gems |
| Issue item | The edited presentation of an approved candidate within a particular newsletter issue |
| Publication | A recorded release of a newsletter issue through a publishing channel |