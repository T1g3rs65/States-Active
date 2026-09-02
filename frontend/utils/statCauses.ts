/** One-line causes for overview chips. Words only. */

export function statCauses(key: string, s: any): string[] {
  const n = (k: string, d = 50) => {
    const v = Number(s?.[k]);
    return Number.isFinite(v) ? v : d;
  };
  const lines: string[] = [];
  switch (key) {
    case 'unemployment':
      if (n('economy_growth', 2) < 1.5) lines.push('slow growth keeps people idle');
      else lines.push('growth is soaking up some of the queue');
      if (n('budget_welfare', 15) > 18) lines.push('welfare is catching some of the fall');
      break;
    case 'inflation':
      if (n('economy_growth', 2) > 3) lines.push('the boom is heating prices');
      if (n('unemployment', 5) < 4.5) lines.push('tight labor is bidding wages up');
      if (n('national_debt', 40) > 70) lines.push('the debt is leaking into prices');
      if (!lines.length) lines.push('near a 2% target unless the boom or bust pulls it');
      break;
    case 'economy_growth':
      if (n('tax_rate', 25) > 32) lines.push('high tax is cooling the shops');
      if (n('national_debt', 40) > 60) lines.push('debt is a drag');
      if (n('scientific_advancement', 50) > 55) lines.push('labs are feeding output');
      if (n('budget_infrastructure', 20) > 20) lines.push('roads and wire are helping');
      break;
    case 'happiness':
      if (n('unemployment', 5) > 8) lines.push('idle hands sour the street');
      if (n('inflation', 2) > 5) lines.push('prices eat the mood');
      if (n('crime_rate', 5) > 8) lines.push('crime keeps people indoors');
      if (n('income_equality', 50) > 55) lines.push('a narrower gap helps');
      break;
    case 'crime_rate':
      if (n('unemployment', 5) > 8) lines.push('joblessness feeds theft');
      if (n('law_enforcement', 50) > 55) lines.push('police are pushing it down');
      if (n('income_equality', 50) < 40) lines.push('the gap shows up at night');
      break;
    case 'life_expectancy':
      lines.push(n('healthcare_quality', 50) > 55 ? 'clinics are adding years' : 'thin clinics cost years');
      if (n('pollution', 50) > 60) lines.push('the air is taking them back');
      break;
    case 'tax_revenue':
    case 'tax_rate':
      if (n('tax_rate', 25) > 32) lines.push('the collector asks a lot');
      else if (n('tax_rate', 25) < 12) lines.push('the collector asks almost nothing');
      else lines.push('the rate is ordinary');
      if (n('corruption', 50) > 55) lines.push('corruption leaks the take');
      else lines.push('most of it actually arrives');
      break;
    case 'national_debt':
      if (n('inflation', 2) > 6) lines.push('hot prices swell the stock');
      lines.push('it only moves a little each day');
      break;
    case 'pollution':
      if (n('gdp', 20) > 35) lines.push('output dirties the air');
      if (n('budget_environment', 5) > 7) lines.push('green spend is scrubbing some of it');
      break;
    case 'scientific_advancement':
      lines.push(n('university_attendance', 30) > 28 ? 'campuses feed the labs' : 'thin campuses starve the labs');
      break;
    case 'gdp':
      lines.push('follows growth, slowly');
      break;
    default:
      break;
  }
  return lines.slice(0, 3);
}
