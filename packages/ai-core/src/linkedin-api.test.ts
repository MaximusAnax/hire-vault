import { describe, expect, it } from "vitest";
import {
  linkedInImportHasContent,
  mapLinkedInApiToImport,
  type LinkedInApiPayload,
} from "./linkedin-api";

describe("mapLinkedInApiToImport", () => {
  it("maps OIDC userinfo only (minimal tier)", () => {
    const payload: LinkedInApiPayload = {
      userinfo: {
        sub: "abc123",
        name: "Jane Doe",
        locale: "en_US",
      },
    };

    const result = mapLinkedInApiToImport(payload);
    expect(result.linkedin_url).toBe("https://www.linkedin.com/in/abc123");
    expect(result.location).toBe("en_US");
    expect(result.experiences).toBeUndefined();
    expect(result.education).toBeUndefined();
    expect(linkedInImportHasContent(result)).toBe(true);
  });

  it("maps Plus-tier current position and education", () => {
    const payload: LinkedInApiPayload = {
      userinfo: { sub: "member-1" },
      identityMe: {
        profileUrl: "https://www.linkedin.com/in/jane-doe",
        headline: { localized: { en_US: "Software Engineer" } },
        primaryCurrentPosition: {
          companyName: { localized: { en_US: "Acme Corp" } },
          title: { localized: { en_US: "Senior Engineer" } },
          startDate: "2022-03",
          locationName: { localized: { en_US: "San Francisco, CA" } },
        },
        mostRecentEducation: {
          schoolName: { localized: { en_US: "State University" } },
          degreeName: { localized: { en_US: "B.S. Computer Science" } },
          fieldOfStudy: { localized: { en_US: "Computer Science" } },
          startDate: "2018",
          endDate: "2022-05",
        },
      },
    };

    const result = mapLinkedInApiToImport(payload);
    expect(result.linkedin_url).toBe("https://www.linkedin.com/in/jane-doe");
    expect(result.headline).toBe("Software Engineer");
    expect(result.experiences).toHaveLength(1);
    expect(result.experiences?.[0]).toMatchObject({
      company: "Acme Corp",
      title: "Senior Engineer",
      start_date: "2022-03-01",
      is_current: true,
      location: "San Francisco, CA",
    });
    expect(result.education).toHaveLength(1);
    expect(result.education?.[0]).toMatchObject({
      institution: "State University",
      degree: "B.S. Computer Science",
      field_of_study: "Computer Science",
      start_date: "2018-01-01",
      expected_graduation: "2022-05-01",
    });
  });

  it("handles empty payload gracefully", () => {
    const result = mapLinkedInApiToImport({});
    expect(result.experiences).toBeUndefined();
    expect(linkedInImportHasContent(result)).toBe(false);
  });

  it("skips incomplete position when company or title missing", () => {
    const payload: LinkedInApiPayload = {
      identityMe: {
        primaryCurrentPosition: {
          companyName: { localized: { en_US: "Acme" } },
        },
      },
    };

    const result = mapLinkedInApiToImport(payload);
    expect(result.experiences).toBeUndefined();
  });

  it("uses vanityName for profile URL when profileUrl absent", () => {
    const payload: LinkedInApiPayload = {
      identityMe: { vanityName: "jane-doe" },
    };

    const result = mapLinkedInApiToImport(payload);
    expect(result.linkedin_url).toBe("https://www.linkedin.com/in/jane-doe");
  });
});
