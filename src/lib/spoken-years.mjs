// Convert spoken calendar years before intent parsing. Keep ambiguous numbers
// untouched so they cannot silently override explicit calendar years.
const englishSmall = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const englishTens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const arabicSmall = ['','واحد','اثنين','ثلاثه','اربعه','خمسه','سته','سبعه','ثمانيه','تسعه','عشره','احد عشر','اثنا عشر','ثلاثه عشر','اربعه عشر','خمسه عشر','سته عشر','سبعه عشر','ثمانيه عشر','تسعه عشر'];
const arabicTens = ['','','عشرين','ثلاثين','اربعين','خمسين','ستين','سبعين','ثمانين','تسعين'];
const english = n => englishSmall[n] ?? englishTens[Math.floor(n / 10)] + (n % 10 ? ' '+englishSmall[n % 10] : '');
const arabic = n => arabicSmall[n] ?? (n % 10 ? arabicSmall[n % 10]+' و' : '')+arabicTens[Math.floor(n / 10)];
const patterns = new Map();
for (let n = 99; n >= 0; n--) {
 const en = english(n).replaceAll(' ', '[- ]+');
 const ar = arabic(n).replace(/ و/g, '\\s*و\\s*').replaceAll(' ', '\\s+').replace('عشرين', 'عشر(?:ين|ون)').replace('اثنين','(?:اثنين|اثنان)');
 if (n) {
  patterns.set('two[- ]+thousand(?:[- ]+and)?[- ]+'+en, 2000+n);
  patterns.set('twenty[- ]+'+(n < 10 ? '(?:oh|zero)[- ]+' : '')+en, 2000+n);
  patterns.set('nineteen[- ]+'+(n < 10 ? '(?:oh|zero)[- ]+' : '')+en, 1900+n);
  patterns.set('(?:ال)?الف(?:ين|ان)\\s*و?\\s*'+ar, 2000+n);
 }
}
patterns.set('two[- ]+thousand', 2000);
patterns.set('(?:ال)?الف(?:ين|ان)', 2000);
const years = new RegExp('(?<![\\p{L}\\p{N}])(?:'+[...patterns.keys()].sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}])','gu');
export const normaliseSpokenYears = question => question.replace(years, phrase => {
 for (const [pattern, year] of patterns) if (new RegExp('^(?:'+pattern+')$','u').test(phrase)) return String(year);
 return phrase;
});
