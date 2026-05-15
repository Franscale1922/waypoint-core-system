/**
 * Archetype nurture sequence dispatcher
 * Maps archetype ID → Day 3 / Day 5 / Day 7 email template functions
 * Consumed by /api/archetype-complete to schedule 7-day nurture via Resend scheduledAt
 */

import { archetypeDay3EducatorHtml, archetypeDay3EducatorText } from "./archetype-day3-educator";
import { archetypeDay5EducatorHtml, archetypeDay5EducatorText } from "./archetype-day5-educator";
import { archetypeDay7EducatorHtml, archetypeDay7EducatorText } from "./archetype-day7-educator";

import { archetypeDay3EmpathHtml, archetypeDay3EmpathText } from "./archetype-day3-empath";
import { archetypeDay5EmpathHtml, archetypeDay5EmpathText } from "./archetype-day5-empath";
import { archetypeDay7EmpathHtml, archetypeDay7EmpathText } from "./archetype-day7-empath";

import { archetypeDay3ConnectorHtml, archetypeDay3ConnectorText } from "./archetype-day3-connector";
import { archetypeDay5ConnectorHtml, archetypeDay5ConnectorText } from "./archetype-day5-connector";
import { archetypeDay7ConnectorHtml, archetypeDay7ConnectorText } from "./archetype-day7-connector";

import { archetypeDay3OperatorHtml, archetypeDay3OperatorText } from "./archetype-day3-operator";
import { archetypeDay5OperatorHtml, archetypeDay5OperatorText } from "./archetype-day5-operator";
import { archetypeDay7OperatorHtml, archetypeDay7OperatorText } from "./archetype-day7-operator";

import { archetypeDay3DriverHtml, archetypeDay3DriverText } from "./archetype-day3-driver";
import { archetypeDay5DriverHtml, archetypeDay5DriverText } from "./archetype-day5-driver";
import { archetypeDay7DriverHtml, archetypeDay7DriverText } from "./archetype-day7-driver";

import { archetypeDay3CommunityBuilderHtml, archetypeDay3CommunityBuilderText } from "./archetype-day3-community_builder";
import { archetypeDay5CommunityBuilderHtml, archetypeDay5CommunityBuilderText } from "./archetype-day5-community_builder";
import { archetypeDay7CommunityBuilderHtml, archetypeDay7CommunityBuilderText } from "./archetype-day7-community_builder";

import { archetypeDay3AnalystHtml, archetypeDay3AnalystText } from "./archetype-day3-analyst";
import { archetypeDay5AnalystHtml, archetypeDay5AnalystText } from "./archetype-day5-analyst";
import { archetypeDay7AnalystHtml, archetypeDay7AnalystText } from "./archetype-day7-analyst";

import { archetypeDay3CreativeHtml, archetypeDay3CreativeText } from "./archetype-day3-creative";
import { archetypeDay5CreativeHtml, archetypeDay5CreativeText } from "./archetype-day5-creative";
import { archetypeDay7CreativeHtml, archetypeDay7CreativeText } from "./archetype-day7-creative";

import type { ArchetypeId } from "@/lib/archetypes";

export interface ArchetypeEmailTemplate {
  subject: string;
  html: (name: string, unsubscribeUrl: string) => string;
  text: (name: string, unsubscribeUrl: string) => string;
}

export interface ArchetypeSequence {
  day3: ArchetypeEmailTemplate;
  day5: ArchetypeEmailTemplate;
  day7: ArchetypeEmailTemplate;
}

export const ARCHETYPE_SEQUENCES: Record<ArchetypeId, ArchetypeSequence> = {
  educator: {
    day3: {
      subject: "What I watch Educators do well",
      html: archetypeDay3EducatorHtml,
      text: archetypeDay3EducatorText,
    },
    day5: {
      subject: "The Educator's trap when evaluating a franchise",
      html: archetypeDay5EducatorHtml,
      text: archetypeDay5EducatorText,
    },
    day7: {
      subject: "One last note, Educator",
      html: archetypeDay7EducatorHtml,
      text: archetypeDay7EducatorText,
    },
  },
  empath: {
    day3: {
      subject: "What I watch Caregivers do well",
      html: archetypeDay3EmpathHtml,
      text: archetypeDay3EmpathText,
    },
    day5: {
      subject: "The Caregiver's trap when evaluating a franchise",
      html: archetypeDay5EmpathHtml,
      text: archetypeDay5EmpathText,
    },
    day7: {
      subject: "One last note, Caregiver",
      html: archetypeDay7EmpathHtml,
      text: archetypeDay7EmpathText,
    },
  },
  connector: {
    day3: {
      subject: "What I watch Connectors do well",
      html: archetypeDay3ConnectorHtml,
      text: archetypeDay3ConnectorText,
    },
    day5: {
      subject: "The Connector's trap when evaluating a franchise",
      html: archetypeDay5ConnectorHtml,
      text: archetypeDay5ConnectorText,
    },
    day7: {
      subject: "One last note, Connector",
      html: archetypeDay7ConnectorHtml,
      text: archetypeDay7ConnectorText,
    },
  },
  operator: {
    day3: {
      subject: "What I watch Operators do well",
      html: archetypeDay3OperatorHtml,
      text: archetypeDay3OperatorText,
    },
    day5: {
      subject: "The Operator's trap when evaluating a franchise",
      html: archetypeDay5OperatorHtml,
      text: archetypeDay5OperatorText,
    },
    day7: {
      subject: "One last note, Operator",
      html: archetypeDay7OperatorHtml,
      text: archetypeDay7OperatorText,
    },
  },
  driver: {
    day3: {
      subject: "What I watch Drivers do well",
      html: archetypeDay3DriverHtml,
      text: archetypeDay3DriverText,
    },
    day5: {
      subject: "The Driver's trap when evaluating a franchise",
      html: archetypeDay5DriverHtml,
      text: archetypeDay5DriverText,
    },
    day7: {
      subject: "One last note, Driver",
      html: archetypeDay7DriverHtml,
      text: archetypeDay7DriverText,
    },
  },
  community_builder: {
    day3: {
      subject: "What I watch Community Builders do well",
      html: archetypeDay3CommunityBuilderHtml,
      text: archetypeDay3CommunityBuilderText,
    },
    day5: {
      subject: "The Community Builder's trap when evaluating a franchise",
      html: archetypeDay5CommunityBuilderHtml,
      text: archetypeDay5CommunityBuilderText,
    },
    day7: {
      subject: "One last note, Community Builder",
      html: archetypeDay7CommunityBuilderHtml,
      text: archetypeDay7CommunityBuilderText,
    },
  },
  analyst: {
    day3: {
      subject: "What I watch Analysts do well",
      html: archetypeDay3AnalystHtml,
      text: archetypeDay3AnalystText,
    },
    day5: {
      subject: "The Analyst's trap when evaluating a franchise",
      html: archetypeDay5AnalystHtml,
      text: archetypeDay5AnalystText,
    },
    day7: {
      subject: "One last note, Analyst",
      html: archetypeDay7AnalystHtml,
      text: archetypeDay7AnalystText,
    },
  },
  creative: {
    day3: {
      subject: "What I watch Creatives do well",
      html: archetypeDay3CreativeHtml,
      text: archetypeDay3CreativeText,
    },
    day5: {
      subject: "The Creative's trap when evaluating a franchise",
      html: archetypeDay5CreativeHtml,
      text: archetypeDay5CreativeText,
    },
    day7: {
      subject: "One last note, Creative",
      html: archetypeDay7CreativeHtml,
      text: archetypeDay7CreativeText,
    },
  },
};

export function getArchetypeSequence(archetypeId: string): ArchetypeSequence | null {
  if (archetypeId in ARCHETYPE_SEQUENCES) {
    return ARCHETYPE_SEQUENCES[archetypeId as ArchetypeId];
  }
  return null;
}
