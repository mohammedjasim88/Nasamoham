import type {Metric, Point} from './locations';
import type {YearValue} from './evidence';

export type AssistantPlan = {
 ok: true;
 metric: Metric;
 start: number;
 end: number;
 mode: 'period' | 'pair' | 'single';
 locations: string[];
 usedContextYears: boolean;
 usedContextMetric: boolean;
 usedContextLocation: boolean;
 genericMuscat: boolean;
};

export type AssistantStudyItem = {
 point: Point;
 values: YearValue[];
 paragraph: string;
 source: string;
 sourceUrl: string;
 isSnapshot: boolean;
 unit: string;
};

export type AssistantStudy = {
 question: string;
 lang: 'ar' | 'en';
 plan: AssistantPlan;
 summary: string;
 comparison: string;
 items: AssistantStudyItem[];
};

export type AssistantTurn = {question: string; summary: string; plan: AssistantPlan};
