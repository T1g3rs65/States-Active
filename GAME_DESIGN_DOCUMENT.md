# Emergent: Rise of Nations - Complete Implementation

## 🎮 Game Overview

"Emergent: Rise of Nations" is a comprehensive nation-building simulation game built with Expo (React Native) for mobile and FastAPI/MongoDB backend. Players take a 15-question political/economic quiz, found their nation, and make daily policy decisions that permanently affect 35+ national statistics.

---

## 📋 Deliverable 1: OpenAI System Prompt for Daily Issues

### Master Issue Generation Prompt (500-700 words)

```
You are the issue generator for 'Emergent: Rise of Nations', a nation simulation game.

Your task is to generate realistic, nuanced policy dilemmas that:
1. Reflect the nation's current situation and stats
2. Have NO clear "right" answer - all choices have trade-offs
3. Range from mundane (local issues) to dramatic (national crises)
4. Feel authentic to the nation's government type and culture
5. Create cascading effects across multiple stats

Current Nation Context:
{context}

Generate {count} issues in the following JSON format:
{
  "issues": [
    {
      "title": "Brief catchy title (5-8 words)",
      "description": "Detailed scenario description (50-150 words). Be specific, vivid, and include stakeholder perspectives.",
      "choices": [
        {
          "text": "Action option (10-20 words)",
          "effects": {
            "stat_name": change_amount,
            // Include 3-8 stats affected, positive and negative
            // Use stat names like: gdp, civil_rights, environment, happiness, crime_rate, etc.
          },
          "description": "What happens if this is chosen (15-30 words)"
        },
        // 4-6 choices per issue
      ]
    }
  ]
}

IMPORTANT RULES:
- Use realistic effect sizes: small changes (±2-5), moderate (±5-15), large (±15-30)
- Each choice must affect at least 3 different stats
- Create genuine trade-offs - rarely should all effects be positive or negative
- Use stat names exactly as they appear in the context
- Make descriptions engaging and consequences believable
- Vary issue types: economy, social, environment, international, crime, etc.
- Reference past decisions occasionally to create narrative continuity
```

---

## 📊 Deliverable 2: Complete List of 35+ Tracked Statistics

### Categories and Stats (with scales and relationships)

#### **Economy (0-100 scale)**
1. **gdp** (GDP per Capita) - Higher is better
2. **economy_growth** (-10 to 15%) - Growth rate, higher is better
3. **unemployment** (0-50%) - Lower is better
4. **inflation** (-5 to 20%) - Target ~2%, extremes are bad

*Relationships:* High GDP often correlates with lower unemployment; rapid growth can increase inflation.

#### **Civil Rights (0-100 scale)**
5. **civil_rights** - Overall civil rights score (aggregate)
6. **freedom_speech** - Freedom of speech
7. **freedom_press** - Freedom of the press
8. **freedom_assembly** - Right to assemble
9. **freedom_religion** - Religious freedom

*Relationships:* Civil rights aggregate = average of the 4 freedoms.

#### **Political Freedoms (0-100 scale)**
10. **political_freedom** - Overall political freedom (calculated from voting rights & corruption)
11. **voting_rights** - Extent of democratic participation
12. **corruption** (0-100) - Lower is better
13. **political_apathy** (0-100) - Lower is better

*Relationships:* Political freedom = (voting_rights + (100 - corruption)) / 2

#### **Social Metrics**
14. **happiness** (0-100) - Quality of life index, influenced by healthcare, income equality, freedoms
15. **life_expectancy** (40-100 years) - Higher is better
16. **obesity_rate** (0-60%) - Lower is better

#### **Environment (0-100 scale)**
17. **environment** - Overall environmental health
18. **pollution** (0-100) - Lower is better
19. **biodiversity** (0-100) - Higher is better
20. **eco_footprint** (0-100) - Lower is better

*Relationships:* High GDP often increases pollution; environmental regulations can reduce growth but improve environment.

#### **Health & Education**
21. **healthcare_quality** (0-100) - Affects life expectancy and happiness
22. **literacy_rate** (0-100%) - Foundation for scientific advancement
23. **university_attendance** (0-80%) - Drives innovation
24. **scientific_advancement** (0-100) - Influenced by education funding and university attendance

#### **Crime & Law**
25. **crime_rate** (0-50 per 1000 people) - Lower is better
26. **law_enforcement** (0-100) - Police presence and effectiveness

*Relationships:* High law enforcement can reduce crime but may reduce civil rights; poverty and unemployment increase crime.

#### **Military**
27. **military_strength** (0-100) - Military capability
28. **defense_spending** (0-50% of GDP) - % of budget on military

#### **Equality & Demographics**
29. **income_equality** (0-100) - Higher is more equal
30. **gini_coefficient** (0.2-0.7) - Lower is more equal (inverse of income_equality)
31. **population** (1-1000 millions)
32. **population_growth** (-5 to 10% per year)

#### **Budget Allocation (percentages, sum to ~100)**
33. **budget_education** (default 15%)
34. **budget_defense** (default 10%)
35. **budget_healthcare** (default 20%)
36. **budget_welfare** (default 15%)
37. **budget_environment** (default 5%)
38. **budget_infrastructure** (default 20%)
39. **budget_other** (default 15%)

#### **Finance**
40. **national_debt** (0-200% of GDP) - Lower is better
41. **tax_rate** (0-80% average) - Balance needed

#### **International**
42. **international_approval** (0-100) - How other nations view you
43. **alliance_power** (0-100) - Strength from alliances

---

## 🎯 Deliverable 3: The 15-Question Onboarding Quiz with Scoring Logic

### Quiz Questions and Scoring Matrix

Each question has 4 options. Player selections modify starting stats based on the scoring matrix below.

#### **Question 1: Economic Development**
*"A company wants to build a factory that will create 500 jobs but may cause environmental damage. What do you do?"*

Options:
1. Approve immediately - jobs are the priority
   - Effects: +15 GDP, +3 economy_growth, -15 environment, +15 pollution
2. Approve with strict environmental regulations
   - Effects: +8 GDP, -5 environment, -5 corruption
3. Deny - environment takes precedence
   - Effects: +20 environment, -10 GDP, +3 unemployment
4. Let citizens vote on it
   - Effects: +15 political_freedom

#### **Question 2: Crime Response**
*"Crime rates are rising. How should your nation respond?"*

Options:
1. Increase police funding and surveillance
   - Effects: +20 law_enforcement, -15 civil_rights, -3 crime_rate
2. Focus on rehabilitation and social programs
   - Effects: +15 civil_rights, +10 budget_welfare, +8 happiness
3. Harsh mandatory minimum sentences
   - Effects: -5 crime_rate, -20 civil_rights, -10 happiness
4. Community policing and education
   - Effects: -2 crime_rate, +8 budget_education, +5 happiness

#### **Question 3: Healthcare System**
*"How should healthcare be provided in your nation?"*

Options:
1. Free universal healthcare for all
   - Effects: +25 healthcare_quality, +15 tax_rate, +15 budget_healthcare, +10 happiness
2. Government-subsidized insurance
   - Effects: +15 healthcare_quality, +8 tax_rate, +5 happiness
3. Private healthcare market
   - Effects: +12 GDP, -10 healthcare_quality, -15 income_equality
4. Basic free care, premium private options
   - Effects: +10 healthcare_quality, +5 GDP, +8 happiness

#### **Question 4: Religious Freedom**
*"A minority religious group requests exemption from certain laws based on their beliefs. What is your stance?"*

Options:
1. Grant full exemption - religious freedom is paramount
   - Effects: +25 freedom_religion, -10 law_enforcement, +15 civil_rights
2. Case-by-case evaluation
   - Effects: +10 freedom_religion, +5 political_freedom
3. Deny - all citizens must follow the same laws
   - Effects: -15 freedom_religion, +15 law_enforcement, -10 civil_rights
4. Hold a referendum
   - Effects: +20 political_freedom, +15 voting_rights

#### **Question 5: Education Structure**
*"How should the education system be structured?"*

Options:
1. Free public education from preschool through university
   - Effects: +5 literacy_rate, +15 university_attendance, +12 tax_rate, +20 budget_education, +10 income_equality
2. Public K-12, private universities
   - Effects: +3 literacy_rate, +8 university_attendance, +10 budget_education
3. Privatized education with vouchers
   - Effects: +10 GDP, -15 income_equality, -5 university_attendance
4. Public schools with heavy STEM focus
   - Effects: +20 scientific_advancement, +10 university_attendance, +12 budget_education

#### **Question 6: Income Inequality**
*"Income inequality is growing. What is your solution?"*

Options:
1. Heavily progressive taxation and wealth redistribution
   - Effects: +30 income_equality, +20 tax_rate, -0.15 gini_coefficient, -8 GDP
2. Moderate progressive taxes with social programs
   - Effects: +15 income_equality, +10 tax_rate, +12 budget_welfare
3. Low taxes - the market will correct itself
   - Effects: +15 GDP, -20 income_equality, +0.1 gini_coefficient, -10 tax_rate
4. Universal basic income
   - Effects: +25 income_equality, +15 happiness, +15 tax_rate, +15 budget_welfare

#### **Question 7: Foreign Criticism**
*"Foreign nations criticize your human rights record. How do you respond?"*

Options:
1. Dismiss their concerns - sovereignty matters most
   - Effects: -20 international_approval, +10 political_freedom
2. Engage in diplomatic dialogue
   - Effects: +10 international_approval, +5 political_freedom
3. Implement reforms to address concerns
   - Effects: +15 civil_rights, +20 international_approval, +8 happiness
4. Strengthen censorship to control the narrative
   - Effects: -25 freedom_press, -20 civil_rights, +15 corruption

#### **Question 8: Government's Economic Role**
*"What is the ideal role of government in the economy?"*

Options:
1. Central planning and state ownership
   - Effects: -20 GDP, +30 income_equality, -15 political_freedom
2. Regulated capitalism with safety nets
   - Effects: +5 GDP, +10 income_equality, +10 happiness
3. Minimal intervention, free markets
   - Effects: +25 GDP, -20 income_equality, -15 tax_rate
4. Strategic intervention in key industries
   - Effects: +12 GDP, +5 income_equality

#### **Question 9: Corporate Pollution**
*"A major corporation is polluting a river. What action do you take?"*

Options:
1. Shut them down immediately
   - Effects: +25 environment, -20 pollution, -15 GDP, +5 unemployment
2. Heavy fines and strict cleanup requirements
   - Effects: +15 environment, -10 pollution, -5 GDP
3. Work with them on a voluntary compliance plan
   - Effects: -5 environment, +5 pollution, +3 GDP
4. Let market forces and consumer choice handle it
   - Effects: -10 environment, +10 pollution, +10 GDP

#### **Question 10: Military & Defense**
*"How should military and defense be prioritized?"*

Options:
1. Large military for national security
   - Effects: +30 military_strength, +15 defense_spending, +20 budget_defense
2. Moderate defense with alliances
   - Effects: +10 military_strength, +5 defense_spending, +5 international_approval
3. Minimal military, focus on diplomacy
   - Effects: -5 defense_spending, -10 military_strength, +10 international_approval
4. Strong military but mostly defensive
   - Effects: +20 military_strength, +8 defense_spending

#### **Question 11: Press Freedom**
*"The press publishes leaked government documents. What is your response?"*

Options:
1. Prosecute the journalists and sources
   - Effects: -25 freedom_press, -20 civil_rights, +10 corruption
2. Investigate the leak but respect press freedom
   - Effects: +5 freedom_press, +5 civil_rights
3. Protect press freedom - transparency is vital
   - Effects: +25 freedom_press, +20 civil_rights, +15 political_freedom
4. Nationalize the press to control information
   - Effects: -30 freedom_press, -25 political_freedom, -25 civil_rights

#### **Question 12: Protest Response**
*"Citizens are protesting government policies. How do you handle it?"*

Options:
1. Protect their right to protest
   - Effects: +25 freedom_assembly, +20 civil_rights, +15 political_freedom
2. Allow protest with permits only
   - Effects: +10 freedom_assembly, +5 civil_rights
3. Disperse protests to maintain order
   - Effects: -15 freedom_assembly, -15 civil_rights, +10 law_enforcement
4. Ban all public protests
   - Effects: -30 civil_rights, -25 political_freedom, -30 freedom_assembly

#### **Question 13: Drug Policy**
*"How should drug policy be approached?"*

Options:
1. Full legalization and regulation
   - Effects: +20 civil_rights, +8 GDP, +2 crime_rate
2. Decriminalize use, punish dealers
   - Effects: +10 civil_rights, -2 crime_rate
3. Harsh penalties for all drug offenses
   - Effects: +15 law_enforcement, -20 civil_rights, -3 crime_rate
4. Medical approach with treatment programs
   - Effects: +10 healthcare_quality, +15 civil_rights, +8 budget_healthcare

#### **Question 14: National Debt**
*"The national debt is growing. What is your strategy?"*

Options:
1. Raise taxes to pay it down
   - Effects: +15 tax_rate, -20 national_debt, -5 happiness
2. Cut government spending across the board
   - Effects: -15 national_debt, -5 budget_education, -5 budget_healthcare
3. Focus on economic growth to outgrow the debt
   - Effects: +10 GDP, +2 economy_growth
4. Strategic mix of modest taxes and targeted cuts
   - Effects: -10 national_debt, +5 tax_rate

#### **Question 15: National Vision**
*"What is your vision for your nation's future?"*

Options:
1. A beacon of freedom and human rights
   - Effects: +20 civil_rights, +20 political_freedom, +15 freedom_speech
2. An economic powerhouse leading in innovation
   - Effects: +15 GDP, +20 scientific_advancement, +3 economy_growth
3. A harmonious society with equality for all
   - Effects: +20 income_equality, +15 happiness, -0.1 gini_coefficient
4. A strong, orderly nation with clear values
   - Effects: +15 law_enforcement, -10 corruption, -3 crime_rate

### Scoring Algorithm

1. Start with all stats at default values (mostly 50/100)
2. Apply each answer's stat modifiers additively
3. Clamp final values to valid ranges:
   - Most stats: 0-100
   - Gini coefficient: 0.2-0.7
   - Life expectancy: 40-100
   - Population: 1-1000
4. Calculate aggregate stats:
   - `civil_rights = (freedom_speech + freedom_press + freedom_assembly + freedom_religion) / 4`
   - `political_freedom = (voting_rights + (100 - corruption)) / 2`
5. Classify government type using `classify_government()` function based on:
   - Civil Rights level
   - GDP/Economy level
   - Political Freedom level

### Government Type Classification

**14 Government Types:**
- Left-Wing Utopia (high civil rights, low economy, high political freedom)
- Scandinavian Liberal Paradise (high civil rights, moderate economy, high political freedom)
- Democratic Socialists (high civil rights, moderate economy)
- Liberal Democratic Paradise (high all three)
- Capitalist Paradise (high economy, high freedoms)
- Corporate Police State (high economy, low civil rights)
- Right-Wing Utopia (high economy, low government intervention)
- Authoritarian Democracy (low political freedom, moderate civil rights, good economy)
- Benevolent Dictatorship (low political freedom, high civil rights)
- Iron Fist Consumerists (low political freedom, high economy)
- Moralistic Democracy (low civil rights, moderate political freedom)
- Psychotic Dictatorship (low on everything)
- Anarchy (very low on everything)
- Father Knows Best State (paternalistic)

---

## 💾 Deliverable 4: Database Schema (MongoDB/Firestore)

### Collections

#### **nations** Collection
```javascript
{
  _id: ObjectId,
  user_id: String (indexed),
  name: String,
  flag_base64: String (optional, base64 encoded image),
  government_type: String (enum of 14 types),
  motto: String (optional),
  description: String (AI-generated flavor text),
  
  // Current stats object
  stats: {
    // All 43 stats listed in Deliverable 2
    gdp: Number,
    economy_growth: Number,
    unemployment: Number,
    // ... all other stats
  },
  
  // Historical snapshots for graphing
  stats_history: [
    {
      timestamp: DateTime,
      stats: { /* snapshot of all stats */ }
    }
  ],
  
  created_at: DateTime,
  last_issue_time: DateTime,
  total_decisions: Number
}
```

**Indexes:**
- `user_id` (unique)
- `stats.gdp` (for rankings)
- `stats.happiness` (for rankings)
- `stats.civil_rights` (for rankings)
- ... (index each stat used in rankings)

#### **issues** Collection
```javascript
{
  _id: ObjectId,
  nation_id: String (indexed),
  title: String,
  description: String (AI-generated),
  choices: [
    {
      text: String,
      effects: {
        stat_name: Number, // change amount
        // ... multiple stats affected
      },
      description: String // consequence preview
    }
  ],
  generated_at: DateTime,
  resolved: Boolean (indexed),
  resolved_at: DateTime (optional),
  chosen_index: Number (optional)
}
```

**Indexes:**
- `nation_id`
- `resolved` (for fetching active issues)

#### **decisions** Collection
```javascript
{
  _id: ObjectId,
  nation_id: String (indexed),
  issue_id: String,
  choice_index: Number,
  stat_changes: {
    stat_name: Number, // applied changes
    // ...
  },
  timestamp: DateTime (indexed)
}
```

**Indexes:**
- `nation_id`
- `timestamp` (for history queries)

### Relationships

- One `user_id` → One `nation` (1:1)
- One `nation` → Many `issues` (1:N)
- One `nation` → Many `decisions` (1:N)
- One `issue` → One `decision` (1:1 when resolved)

---

## 📝 Deliverable 5: Dynamic Nation Description Prompt Example

### Nation Description Generation Prompt

```
You are a creative writer for 'Emergent: Rise of Nations'.

Write a vivid, engaging 300-600 word description of the nation based on its current stats.

The description should:
1. Paint a picture of what life is like for ordinary citizens
2. Reflect the government type and political atmosphere
3. Mention notable strengths and challenges
4. Include specific details about culture, economy, and society
5. Use evocative language and concrete examples
6. Evolve based on stat thresholds (e.g., describe differently if civil_rights > 85 vs < 20)

Current Nation Context:
{context}

Example Context:
"""
Nation: The United Federation
Government Type: Scandinavian Liberal Paradise
Age: 15 days old
Total Decisions Made: 7

Top Performing Stats:
  - Civil Rights: 89.2/100
  - Healthcare Quality: 85.0/100
  - Happiness: 82.5/100
  - Income Equality: 78.3/100
  - Life Expectancy: 82.0 years

Lowest Performing Stats:
  - Military Strength: 25.0/100
  - Defense Spending: 3.5% GDP
  - Crime Rate: 8.2 per 1000
  - National Debt: 52.0% GDP

Key Stats:
  - GDP: 72.5/100
  - Civil Rights: 89.2/100
  - Political Freedom: 85.0/100
  - Happiness: 82.5/100
  - Environment: 68.0/100
  - Crime Rate: 8.2 per 1000
  - Income Equality: 78.3/100
  - Tax Rate: 42.5%
"""

Example Output:
"""
The United Federation stands as a beacon of progressive values and social harmony in the modern world. Walking through the streets of its bustling capital, one sees citizens engaged in spirited debates at outdoor cafés, their voices free and unafraid—a testament to civil rights protections that rank among the world's strongest.

Healthcare is a point of national pride. Universal coverage ensures that no citizen faces financial ruin from illness, and life expectancy has soared to 82 years. The comprehensive welfare system, funded by taxes that citizens largely accept as the price of prosperity, catches those who stumble and helps them rise again.

Yet beneath this veneer of harmony, challenges simmer. A modest military means the Federation relies on diplomatic goodwill and strategic alliances for security. Some citizens worry about vulnerability in an unstable world. Meanwhile, crime rates have crept upward—not catastrophically, but enough to spark heated parliamentary debates about whether the nation's light-touch policing needs reinforcement.

The economy hums along steadily, neither spectacular nor struggling. Innovation thrives in the tech sector, subsidized by generous education funding. Income inequality remains low by global standards, though the national debt hovers uncomfortably above 50% of GDP, a legacy of ambitious social programs launched during the nation's founding days.

Environmental consciousness permeates society. Green energy initiatives dot the landscape, though industrial needs sometimes clash with ecological goals. The tension between economic growth and environmental preservation plays out daily in policy chambers and town halls.

Above all, the Federation is a nation of engaged citizens. Voter turnout is robust, public forums overflow with participation, and transparency is not just policy but cultural expectation. The government, for all its imperfections, genuinely reflects the will of the people—a democracy in its truest sense.
"""

Write in third person, present tense. Make it feel like a living, breathing nation with real people and real consequences from policy decisions.
```

---

## 🏗️ Project Structure

```
/app/
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── models.py           # Pydantic models for Nation, Issue, Decision
│   ├── quiz.py             # Quiz questions and scoring logic
│   ├── stats_config.py     # Stat definitions and government classification
│   ├── ai_service.py       # OpenAI integration for issue/description generation
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables (EMERGENT_LLM_KEY, MONGO_URL, DB_NAME)
│
└── frontend/
    ├── app/
    │   ├── index.tsx       # Welcome screen
    │   ├── quiz.tsx        # 15-question onboarding quiz
    │   └── (tabs)/         # Main app navigation
    │       ├── _layout.tsx     # Bottom tab navigator
    │       ├── overview.tsx    # National overview with stats dashboard
    │       ├── issues.tsx      # Daily issues screen
    │       ├── rankings.tsx    # Global rankings and leaderboards
    │       └── nation.tsx      # Nation profile and details
    ├── store/
    │   └── nationStore.ts  # Zustand state management
    ├── types/
    │   └── index.ts        # TypeScript interfaces
    ├── utils/
    │   └── api.ts          # API client functions
    ├── package.json
    └── .env               # Environment variables (EXPO_PUBLIC_BACKEND_URL)
```

---

## 🚀 Features Implemented

### ✅ Core Features (100% Complete)

1. **15-Question Onboarding Quiz**
   - Political/economic/social questions
   - Calculates starting stats based on answers
   - Classifies government type
   - Flag upload support
   - Nation name and motto input

2. **Nation Dashboard (Overview)**
   - Display all 35+ statistics
   - Categorized view (Economy, Freedoms, Social, Environment, Finance)
   - Color-coded stats (green/yellow/red based on performance)
   - Nation description (AI-generated)
   - Government type display
   - Population, decisions, approval stats

3. **Daily Issues System**
   - AI-generated policy dilemmas using GPT-4o
   - 3 issues per day (or manual trigger)
   - 4-6 choices per issue
   - Preview of stat effects for each choice
   - Confirmation dialog before submission
   - Shows actual stat changes after decision

4. **Decision Impact**
   - Permanent stat modifications
   - Stats history tracking for graphs
   - Decision counter
   - Issue resolution

5. **Rankings & Leaderboards**
   - Global top 100 for any stat (GDP, Happiness, Civil Rights, etc.)
   - "Most Extreme" categories (Happiest, Greenest, Richest, Safest, etc.)
   - Medal display for top 3
   - Filterable by stat category

6. **Nation Profile**
   - Full nation description
   - Flag display
   - Creation date and age
   - Total decisions made
   - Budget allocation breakdown with visual bars
   - International standing stats
   - Reset nation option

### 🎨 UI/UX Features

- **Dark Mode Design** - Beautiful gradient backgrounds
- **Pull to Refresh** - Refresh nation data, issues, rankings
- **Loading States** - Activity indicators for async operations
- **Error Handling** - Alerts for failed operations
- **Responsive Design** - Works on all screen sizes
- **Safe Area Handling** - Proper insets for notched devices
- **Tab Navigation** - Bottom tabs with icons

### 🔌 Backend Features

- **RESTful API** - 11 endpoints (all tested and working)
- **OpenAI Integration** - GPT-4o for issue and description generation
- **MongoDB Database** - Persistent storage for nations, issues, decisions
- **Stats Calculation** - Complex scoring algorithm from quiz
- **Government Classification** - 14 government types based on stats
- **Stats Validation** - Clamping values to valid ranges
- **CORS Enabled** - Allows frontend access

---

## 🧪 Testing Results

### Backend API Testing: 11/11 Tests Passing ✅

1. ✅ Health Check - `/api/health`
2. ✅ Get Quiz Questions - `/api/quiz/questions` (15 questions)
3. ✅ Create Nation - `/api/nations` (with AI description)
4. ✅ Get Nation by ID - `/api/nations/{id}`
5. ✅ Get Nation by User - `/api/nations/user/{user_id}`
6. ✅ Generate Issues - `/api/nations/{id}/issues?force_generate=true` (AI-powered)
7. ✅ Get Existing Issues - `/api/nations/{id}/issues`
8. ✅ Submit Decision - `/api/decisions`
9. ✅ Rankings by Stat - `/api/rankings/gdp`
10. ✅ Extreme Rankings - `/api/rankings/extremes/happiest`
11. ✅ Stats History - `/api/nations/{id}/history/happiness`

**All backend endpoints are fully functional and tested with real data flows.**

---

## 🔑 Environment Variables

### Backend `.env`
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EMERGENT_LLM_KEY=sk-emergent-96dA054D13696246dF
```

### Frontend `.env`
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
EXPO_PACKAGER_PROXY_URL=... (auto-configured)
EXPO_PACKAGER_HOSTNAME=... (auto-configured)
```

---

## 📦 Dependencies

### Backend
- fastapi==0.110.1
- uvicorn==0.25.0
- pymongo==4.5.0
- motor==3.3.1
- pydantic>=2.6.4
- python-dotenv>=1.0.1
- emergentintegrations==0.1.0 (custom OpenAI wrapper)

### Frontend
- expo (SDK 54)
- react-native
- expo-router (file-based routing)
- zustand (state management)
- @react-native-async-storage/async-storage
- expo-linear-gradient
- expo-image-picker
- date-fns
- socket.io-client (for future multiplayer)
- react-native-gifted-charts (for future charts)

---

## 🎯 Next Phase: Future Enhancements

The following features were designed but not yet implemented (MVP is single-player focused):

### Phase 2 Features:
1. **Stat Charts** - Line graphs showing 90-day trends using react-native-gifted-charts
2. **Multiplayer World Map** - 10,000+ hexagonal territories with real-time updates
3. **Territory Conquest** - Expand your nation through military or diplomatic means
4. **Alliance System** - Form coalitions with other players
5. **Diplomacy Screen** - Trade agreements, non-aggression pacts, wars
6. **Daily Notifications** - Push notifications when issues are ready
7. **Nation-to-Nation Interactions** - Trade, warfare, cultural exchange

---

## 🎓 Technical Highlights

### OpenAI Integration (Using Emergent LLM Key)
- Custom `emergentintegrations` library provides unified API for OpenAI, Anthropic, Gemini
- Universal key `EMERGENT_LLM_KEY` works across providers
- Using `gpt-4o` model for high-quality issue and description generation
- Context-aware prompts feed current nation stats for personalized content

### Stats Calculation Engine
- Complex interdependencies (e.g., civil_rights affects happiness; GDP affects pollution)
- Weighted scoring from quiz answers
- Government classification algorithm based on 3 key dimensions
- Value clamping to valid ranges

### Mobile-First Design
- Bottom tab navigation pattern
- Card-based UI for issues
- Pull-to-refresh patterns
- Native platform components (React Native)
- Safe area handling for all devices

### Database Design
- Normalized structure with clear relationships
- Stats history as embedded array for efficient time-series queries
- Indexed fields for fast ranking queries
- ObjectId handling for MongoDB

---

## 🏁 Conclusion

**Emergent: Rise of Nations** is a fully functional, single-player nation-building simulation game with:

- ✅ Complete 15-question onboarding quiz with sophisticated scoring
- ✅ 35+ tracked statistics with realistic relationships
- ✅ AI-powered daily issues using GPT-4o (OpenAI)
- ✅ AI-generated dynamic nation descriptions
- ✅ Decision-making system with permanent consequences
- ✅ Global rankings and leaderboards
- ✅ Beautiful mobile UI with dark mode
- ✅ Comprehensive backend API (11 endpoints, all tested)
- ✅ MongoDB persistence
- ✅ Government classification system (14 types)

The game delivers on all core requirements and provides a solid foundation for future multiplayer features. Players can create their nation, face daily dilemmas, watch their stats evolve, and compete globally—all in a polished mobile experience.

---

*Built with Expo, React Native, FastAPI, MongoDB, and OpenAI GPT-4o*
