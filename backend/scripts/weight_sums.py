import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from government_wheels import WHEEL_1, WHEEL_1_ZYTHERA, WHEEL_2, WHEEL_2_ZYTHERA, WHEEL_3, WHEEL_4, FOUNDING_ODDS
print('W1 human:', sum(w for _, w in WHEEL_1))
print('W1 zythera:', sum(w for _, w in WHEEL_1_ZYTHERA))
for k, v in WHEEL_2.items(): print('W2 human', k, sum(w for _, w in v))
for k, v in WHEEL_2_ZYTHERA.items(): print('W2 zythera', k, sum(w for _, w in v))
print('W3:', sum(w for _, w in WHEEL_3))
print('W4:', sum(w for _, w in WHEEL_4))
for k, v in FOUNDING_ODDS.items(): print('founding', k, sum(w for _, w in v))
