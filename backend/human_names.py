"""Large human given-name and surname pools for leaders (and titles)."""

# Austin is in the pool but must not be the default. Sigears is never a surname.

MALE_FIRST = [
    "James", "William", "Alexander", "Theodore", "Charles", "Edward", "George",
    "Richard", "Thomas", "Benjamin", "Frederick", "Arthur", "Henry", "Robert",
    "Victor", "Marcus", "Sebastian", "Nicholas", "Jonathan", "Maximilian",
    "Oliver", "Samuel", "Daniel", "Matthew", "Joseph", "David", "Andrew",
    "Michael", "Christopher", "Anthony", "Joshua", "Nathan", "Caleb", "Ethan",
    "Lucas", "Noah", "Liam", "Owen", "Isaac", "Jacob", "Aaron", "Adam",
    "Adrian", "Albert", "Alfred", "Ambrose", "Angus", "Archibald", "August",
    "Bartholomew", "Bernard", "Blake", "Brandon", "Brian", "Bruce", "Calvin",
    "Cameron", "Carl", "Cedric", "Claude", "Colin", "Conrad", "Cornelius",
    "Curtis", "Damian", "Dean", "Dennis", "Derek", "Desmond", "Dominic",
    "Donald", "Douglas", "Duncan", "Dustin", "Edgar", "Edmund", "Edwin",
    "Elias", "Elliot", "Ellis", "Emil", "Emmett", "Eric", "Ernest", "Eugene",
    "Evan", "Everett", "Felix", "Fletcher", "Francis", "Frank", "Franklin",
    "Gabriel", "Gareth", "Gavin", "Gerald", "Gilbert", "Gordon", "Graham",
    "Grant", "Gregory", "Griffin", "Harold", "Harrison", "Harvey", "Hector",
    "Howard", "Hugh", "Hugo", "Ian", "Ivan", "Jack", "Jacob", "Jasper",
    "Jeremy", "Joel", "John", "Jonah", "Julian", "Justin", "Keith", "Kenneth",
    "Kevin", "Lawrence", "Leo", "Leonard", "Leon", "Lewis", "Louis", "Luke",
    "Malcolm", "Martin", "Mason", "Matthew", "Maurice", "Maxwell", "Miles",
    "Nathaniel", "Neil", "Nigel", "Nolan", "Norman", "Oscar", "Otto", "Patrick",
    "Paul", "Peter", "Philip", "Pierce", "Quentin", "Ralph", "Raymond", "Reed",
    "Reginald", "Reuben", "Riley", "Roger", "Roland", "Roman", "Ronald",
    "Rory", "Roy", "Russell", "Ryan", "Scott", "Sean", "Seth", "Silas",
    "Simon", "Spencer", "Stanley", "Stephen", "Stewart", "Sullivan", "Terrence",
    "Timothy", "Tobias", "Travis", "Trevor", "Tristan", "Tyler", "Vernon",
    "Vincent", "Wade", "Wallace", "Walter", "Warren", "Wayne", "Wesley",
    "Wilfred", "Zachary", "Austin",
]

FEMALE_FIRST = [
    "Elizabeth", "Victoria", "Catherine", "Margaret", "Eleanor", "Isabella",
    "Charlotte", "Alexandra", "Sophia", "Helena", "Anastasia", "Caroline",
    "Beatrice", "Josephine", "Valentina", "Evangeline", "Genevieve", "Arabella",
    "Penelope", "Cordelia", "Jane", "Mary", "Anne", "Alice", "Emma", "Olivia",
    "Amelia", "Mia", "Harper", "Evelyn", "Abigail", "Emily", "Ella", "Avery",
    "Scarlett", "Grace", "Chloe", "Camila", "Penelope", "Riley", "Layla",
    "Lillian", "Nora", "Zoey", "Mila", "Aubrey", "Hannah", "Lily", "Addison",
    "Eleanor", "Natalie", "Luna", "Savannah", "Brooklyn", "Leah", "Zoe",
    "Stella", "Hazel", "Ellie", "Paisley", "Audrey", "Skylar", "Violet",
    "Claire", "Bella", "Aurora", "Lucy", "Anna", "Samantha", "Caroline",
    "Genesis", "Aaliyah", "Kennedy", "Kinsley", "Allison", "Maya", "Sarah",
    "Madelyn", "Adeline", "Alexa", "Ariana", "Elena", "Gabriella", "Naomi",
    "Alice", "Sadie", "Hailey", "Eva", "Emilia", "Autumn", "Quinn", "Nevaeh",
    "Piper", "Ruby", "Serenity", "Willow", "Everly", "Cora", "Kaylee", "Lydia",
    "Aubree", "Arianna", "Eliana", "Peyton", "Melanie", "Gianna", "Isabelle",
    "Julia", "Valeria", "Natalia", "Quinn", "Delilah", "Ivy", "Raelynn",
    "Jade", "Clara", "Vivian", "Josephine", "Allison", "Iris", "Katherine",
    "Andrea", "Josephine", "Megan", "Rebecca", "Lauren", "Jessica", "Amanda",
    "Melissa", "Stephanie", "Nicole", "Heather", "Diane", "Ruth", "Julie",
    "Kelly", "Christina", "Joan", "Martha", "Gloria", "Teresa", "Frances",
    "Kathryn", "Janice", "Marie", "Rose", "Lily", "Ivy", "Hazel", "Octavia",
    "Natalia", "Clara", "Elena", "Diana", "Florence", "Harriet", "Irene",
    "Sylvia", "Theodora", "Winifred", "Cecilia", "Daphne", "Francesca", "Greta",
    "Imogen", "Juliet", "Lorelei", "Matilda", "Ophelia", "Rosalind", "Thea",
    "Vera", "Willa", "Yvette", "Adelaide", "Bridget", "Celia", "Dorothy",
    "Edith", "Fiona", "Gwendolyn", "Honora", "Ingrid", "Jessica",
]

SURNAMES = [
    "Blackwood", "Sterling", "Ashford", "Hartwell", "Whitmore", "Crawford",
    "Beaumont", "Grayson", "Hamilton", "Aldridge", "Thornton", "Pemberton",
    "Fairfax", "Carrington", "Davenport", "Everett", "Fitzgerald", "Kensington",
    "Lancaster", "Windsor", "Anderson", "Bennett", "Douglas", "Edwards",
    "Fletcher", "Graham", "Harrison", "Irving", "Jefferson", "Kingsley",
    "Morrison", "Northwood", "Osborne", "Quincy", "Rothschild", "Underwood",
    "Vanderbilt", "Wellington", "York", "Cromwell", "Lockwood", "Mercer",
    "Abbott", "Archer", "Atwood", "Baker", "Barclay", "Barnes", "Barrett",
    "Barton", "Bates", "Baxter", "Beckett", "Bell", "Benson", "Blair",
    "Bolton", "Booth", "Bowen", "Bradford", "Brady", "Brennan", "Brooks",
    "Brown", "Buchanan", "Burke", "Burns", "Butler", "Byrne", "Caldwell",
    "Callahan", "Campbell", "Carpenter", "Carson", "Carter", "Chambers",
    "Chandler", "Clark", "Clarke", "Clement", "Coleman", "Collins", "Cooper",
    "Corbett", "Cox", "Craig", "Crane", "Cross", "Cunningham", "Curtis",
    "Dalton", "Daniels", "Davidson", "Davies", "Davis", "Dawson", "Day",
    "Dean", "Dixon", "Donovan", "Doyle", "Drake", "Dudley", "Duffy",
    "Duncan", "Dunne", "Ellis", "Emerson", "Evans", "Farrell", "Field",
    "Finch", "Fisher", "Flynn", "Ford", "Foster", "Fox", "Fraser", "Frost",
    "Gallagher", "Garcia", "Gardner", "Garrett", "Gibson", "Glover", "Goodwin",
    "Gordon", "Grant", "Green", "Greene", "Griffin", "Hall", "Hancock",
    "Hansen", "Harding", "Harper", "Harris", "Hart", "Hawkins", "Hayes",
    "Henderson", "Hewitt", "Hicks", "Hill", "Hobbs", "Hodges", "Hoffman",
    "Holland", "Holmes", "Holt", "Hopkins", "Howard", "Hughes", "Hunt",
    "Hunter", "Ingram", "Jackson", "Jacobs", "Jenkins", "Jensen", "Johnson",
    "Johnston", "Jones", "Jordan", "Kane", "Keller", "Kelly", "Kennedy",
    "Kent", "Kerr", "King", "Knight", "Lambert", "Lane", "Lang", "Lawson",
    "Lee", "Leonard", "Lewis", "Little", "Lloyd", "Long", "Lowe", "Lynch",
    "Lyons", "MacLeod", "Madden", "Malone", "Marsh", "Marshall", "Martin",
    "Mason", "Matthews", "Maxwell", "May", "McCarthy", "McDonald", "McGrath",
    "Miller", "Mills", "Mitchell", "Moore", "Moran", "Morgan", "Morris",
    "Murphy", "Murray", "Myers", "Nash", "Nelson", "Newman", "Newton",
    "Nichols", "Nixon", "Nolan", "Norris", "Oakley", "OBrien", "OConnor",
    "Oliver", "ONeill", "Owens", "Palmer", "Parker", "Patterson", "Payne",
    "Pearce", "Pearson", "Perez", "Perkins", "Perry", "Peters", "Phillips",
    "Pierce", "Porter", "Powell", "Price", "Quinn", "Ramsey", "Reed",
    "Reeves", "Reid", "Reynolds", "Rhodes", "Rice", "Richards", "Richardson",
    "Riley", "Roberts", "Robertson", "Robinson", "Rogers", "Rose", "Ross",
    "Rowe", "Russell", "Ryan", "Sanders", "Scott", "Shaw", "Shelton",
    "Shepherd", "Sherman", "Simmons", "Simpson", "Sinclair", "Slater",
    "Smith", "Snyder", "Spencer", "Steele", "Stevens", "Stewart", "Stone",
    "Sullivan", "Sutton", "Taylor", "Thomas", "Thompson", "Turner", "Tyler",
    "Vaughn", "Wade", "Walker", "Wallace", "Walsh", "Ward", "Warren",
    "Watkins", "Watson", "Weaver", "Webb", "Wells", "West", "Wheeler",
    "White", "Wilkins", "Williams", "Williamson", "Wilson", "Winters",
    "Wood", "Woods", "Wright", "Young",
]

# Unique, keep order (Austin last among firsts already).
def _uniq(seq):
    seen = set()
    out = []
    for x in seq:
        k = x.lower()
        if k in seen or k == "sigears":
            continue
        seen.add(k)
        out.append(x)
    return out


HUMAN_MALE_FIRST_NAMES = _uniq(MALE_FIRST)
HUMAN_FEMALE_FIRST_NAMES = _uniq(FEMALE_FIRST)
HUMAN_LAST_NAMES = _uniq(SURNAMES)
FEMALE_FIRST_LOWER = {n.lower() for n in HUMAN_FEMALE_FIRST_NAMES} | {
    "queen", "empress", "lady", "dame", "duchess",
}
