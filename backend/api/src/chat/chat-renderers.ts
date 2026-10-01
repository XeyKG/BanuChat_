import type { AnnouncementsResult } from "../application/announcements.js";
import type { CalendarEventsResult } from "../application/calendar-events.js";
import type {
  ProfileProgressResult,
  ProfileProgressStatus,
} from "../application/profile-progress.js";
import type {
  FastPathAnswer,
  PersistenceCitation,
  PresentationCitation,
} from "./chat-types.js";

const PROFILE_STATUS_LABELS: Record<ProfileProgressStatus, string> = {
  enrolled: "inscrito",
  in_progress: "en progreso",
  completed: "completado",
};

const ANNOUNCEMENT_STATUS_LABELS = {
  active: "activo",
  upcoming: "próximo",
  expired: "vencido",
} as const;

function citation(
  index: number,
  sourceKind: PresentationCitation["source_kind"],
  label: string,
  locator: string,
  releaseId: string,
): PresentationCitation {
  return {
    index,
    source_kind: sourceKind,
    label,
    locator,
    release_id: releaseId,
    document_version_id: null,
    artifact_url: null,
  };
}

function persistenceCitation(
  index: number,
  releaseId: string,
  source: {
    source_path: string;
    source_locator: string;
    source_sha256: string;
  },
  identity:
    | { source_kind: "profile"; profile_key: string }
    | {
        source_kind: "profile_course";
        profile_key: string;
        course_key: string;
      }
    | { source_kind: "calendar_event"; event_key: string }
    | { source_kind: "announcement"; announcement_key: string },
): PersistenceCitation {
  const base = {
    citation_index: index,
    dataset_release_id: releaseId,
    source_path: source.source_path,
    source_locator: source.source_locator,
    source_sha256: source.source_sha256,
    document_version_id: null,
    chunk_id: null,
  } as const;

  if (identity.source_kind === "profile") {
    return {
      ...base,
      ...identity,
      course_key: null,
      event_key: null,
      announcement_key: null,
    };
  }
  if (identity.source_kind === "profile_course") {
    return {
      ...base,
      ...identity,
      event_key: null,
      announcement_key: null,
    };
  }
  if (identity.source_kind === "calendar_event") {
    return {
      ...base,
      ...identity,
      profile_key: null,
      course_key: null,
      announcement_key: null,
    };
  }
  return {
    ...base,
    ...identity,
    profile_key: null,
    course_key: null,
    event_key: null,
  };
}

export function renderProfileProgress(
  result: ProfileProgressResult,
): FastPathAnswer {
  if (result.courses.length === 0) {
    return {
      kind: "answered",
      route: "profile_progress",
      release_id: result.release_id,
      content:
        "No encontré cursos que coincidan con ese filtro para el perfil seleccionado.",
      insufficient_evidence: false,
      citations: [],
      citation_records: [],
    };
  }

  const lines = result.courses.map(
    (course) =>
      `- ${course.course_name}: ${course.progress_percent} % (${PROFILE_STATUS_LABELS[course.status]}).`,
  );
  const citations = [
    citation(
      0,
      "profile",
      `Perfil: ${result.profile.alias}`,
      result.profile.source.source_locator,
      result.release_id,
    ),
    ...result.courses.map((course, index) =>
      citation(
        index + 1,
        "profile_course",
        `Progreso: ${course.course_name}`,
        course.source.source_locator,
        result.release_id,
      ),
    ),
  ];
  const citationRecords: PersistenceCitation[] = [
    persistenceCitation(0, result.release_id, result.profile.source, {
      source_kind: "profile",
      profile_key: result.profile.profile_key,
    }),
    ...result.courses.map((course, index) =>
      persistenceCitation(index + 1, result.release_id, course.source, {
        source_kind: "profile_course",
        profile_key: result.profile.profile_key,
        course_key: course.course_key,
      }),
    ),
  ];

  return {
    kind: "answered",
    route: "profile_progress",
    release_id: result.release_id,
    content: `Progreso registrado para ${result.profile.alias}:\n${lines.join("\n")}`,
    insufficient_evidence: false,
    citations,
    citation_records: citationRecords,
  };
}

export function renderCalendarEvents(
  result: CalendarEventsResult,
): FastPathAnswer {
  if (result.events.length === 0) {
    return {
      kind: "answered",
      route: "calendar_events",
      release_id: result.release_id,
      content: "No encontré eventos que comiencen dentro del rango consultado.",
      insufficient_evidence: false,
      citations: [],
      citation_records: [],
    };
  }

  const citations = result.events.map((event, index) =>
    citation(
      index,
      "calendar_event",
      `Evento: ${event.title}`,
      event.source.source_locator,
      result.release_id,
    ),
  );
  const citationRecords = result.events.map((event, index) =>
    persistenceCitation(index, result.release_id, event.source, {
      source_kind: "calendar_event",
      event_key: event.event_key,
    }),
  );

  return {
    kind: "answered",
    route: "calendar_events",
    release_id: result.release_id,
    content: `Encontré estos eventos:\n${result.events
      .map((event) => `- ${event.starts_at} — ${event.title}`)
      .join("\n")}`,
    insufficient_evidence: false,
    citations,
    citation_records: citationRecords,
  };
}

export function renderAnnouncements(
  result: AnnouncementsResult,
): FastPathAnswer {
  if (result.announcements.length === 0) {
    return {
      kind: "answered",
      route: "announcements",
      release_id: result.release_id,
      content: "No encontré anuncios que coincidan con la consulta.",
      insufficient_evidence: false,
      citations: [],
      citation_records: [],
    };
  }

  const citations = result.announcements.map((announcement, index) =>
    citation(
      index,
      "announcement",
      `Anuncio: ${announcement.title}`,
      announcement.source.source_locator,
      result.release_id,
    ),
  );
  const citationRecords = result.announcements.map((announcement, index) =>
    persistenceCitation(index, result.release_id, announcement.source, {
      source_kind: "announcement",
      announcement_key: announcement.announcement_key,
    }),
  );

  return {
    kind: "answered",
    route: "announcements",
    release_id: result.release_id,
    content: `Encontré estos anuncios:\n${result.announcements
      .map(
        (announcement) =>
          `- ${announcement.title} — ${ANNOUNCEMENT_STATUS_LABELS[announcement.temporal_status]}`,
      )
      .join("\n")}`,
    insufficient_evidence: false,
    citations,
    citation_records: citationRecords,
  };
}
