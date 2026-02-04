import { logger } from '../../config/logger';
import { HashtagVariationSettings, randomIntInRange } from '../../config/variations';

const POPULAR: string[] = [
  'viral','trending','explore','fyp','instagood','love','life','ootd','style','fashion',
  'fitness','travel','food','beauty','art','music','motivation','success','happy','fun',
  'friends','adventure','nature','photography',
];
const MEDIUM: string[] = [
  'contentcreator','dailylife','reels','hustlehard','creativelife','mindset','selfcare',
  'wellness','positivity','entrepreneur','lifestyle','inspiration','authentic','community',
  'creativity','storytelling','passion','journey','goals','gratitude','growth','vibes',
];
const NICHE: Record<string, string[]> = {
  fitness:  ['homeworkout','fitnessmotivation','gymlife','workoutdaily','healthylife','strongbody','cardio'],
  food:     ['mealprep','homecooking','foodlover','recipesofinstagram','organicfood','foodblogger'],
  fashion:  ['ootdfashion','streetwear','fashioninspo','casualstyle','outfitideas','wardrobe'],
  travel:   ['wanderlust','travelgram','roadtrip','backpacking','exploretheworld','solotravel'],
  tech:     ['techlife','coding','developer','startup','innovation','ai','techblogger','devlife'],
  art:      ['digitalart','artofinstagram','creativeprocess','artistlife','artdaily','artcommunity'],
  music:    ['musiclover','musicproduction','producer','beatmaking','songwriter','musiclife'],
  business: ['entrepreneurlife','smallbusiness','businessgrowth','startuplife','hustleculture'],
  default:  ['content','creative','daily','moments','aesthetic','reallife','authentic','goodvibes'],
};
const TIME_TAGS: Record<string, string[]> = {
  morning: ['morningvibes','morningroutine','goodmorning'],
  afternoon: ['afternoonvibes','midday','lunchtime'],
  evening: ['eveningvibes','sunset','goldenhour'],
  night: ['nightvibes','nighttime','latenight'],
};

export class HashtagGenerator {
  private settings: HashtagVariationSettings;
  constructor(settings?: Partial<HashtagVariationSettings>) {
    this.settings = { minCount: 5, maxCount: 15, popularRatio: 0.4, rotationSize: 50, ...settings };
  }
  createHashtagVariation(baseHashtags?: string[], niche: string = 'default', accountId?: string): string[] {
    const count = randomIntInRange(this.settings.minCount, this.settings.maxCount);
    const popCount = Math.round(count * this.settings.popularRatio);
    const nicheCount = count - popCount;
    const tags: string[] = [];
    tags.push(...this.shuffle(POPULAR).slice(0, popCount));
    const nichePool = [...(NICHE[niche] || NICHE.default), ...MEDIUM];
    tags.push(...this.shuffle(nichePool).slice(0, nicheCount));
    const period = this.currentPeriod();
    const tt = TIME_TAGS[period];
    tags.push(tt[Math.floor(Math.random() * tt.length)]);
    if (baseHashtags) {
      for (const tag of baseHashtags) {
        const clean = tag.replace(/^#/, '').toLowerCase();
        if (!tags.includes(clean)) tags.push(clean);
      }
    }
    const unique = [...new Set(tags.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, '')))];
    const rotated = accountId ? this.rotate(unique, accountId) : unique;
    return rotated.slice(0, this.settings.maxCount).map((t) => '#' + t);
  }
  rotateHashtags(accountId: string, tags: string[]): string[] {
    return tags.length === 0 ? tags : this.rotate(tags, accountId);
  }
  private currentPeriod(): keyof typeof TIME_TAGS {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 21) return 'evening';
    return 'night';
  }
  private rotate<T>(arr: T[], seed: string): T[] {
    const offset = this.hash(seed) % arr.length;
    return [...arr.slice(offset), ...arr.slice(0, offset)];
  }
  private shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  private hash(str: string): number {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
}
export const hashtagGenerator = new HashtagGenerator();
