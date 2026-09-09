import { Router } from "express";
import type {
  Horoscope,
  Kundli,
  Panchang,
  UserProfile,
} from "../types.js";

const userProfile: UserProfile = {
  id: "user_101",
  name: "Aarav",
  preferredLanguage: "English",
  preferredTone: "supportive",
  subscription: "free",
  birthDetails: {
    date: "1992-05-14",
    time: "08:30",
    place: "Mumbai, India",
  },
};

const kundli: Kundli = {
  userId: "user_101",
  moonSign: "Taurus",
  currentDasha:
    "Jupiter Mahadasha encourages patient expansion and learning.",
  houses: {
    "6": "Steady routines support wellbeing.",
    "7": "Partnerships benefit from patient communication.",
    "10":
      "Saturn in the 10th house favors disciplined, durable career progress.",
  },
  ascendant: "Virgo",
  planets: {
    sun: "Taurus",
    moon: "Taurus",
    saturn: "Capricorn",
    jupiter: "Virgo",
  },
};

const horoscope: Horoscope = {
  userId: "user_101",
  career:
    "A period for consolidating skills, seeking mentorship, and taking measured leadership opportunities.",
  relationship: "Clear communication and shared routines create steadiness.",
  health: "Consistency in rest and daily habits deserves attention.",
  finance:
    "Prefer deliberate planning and sustainable commitments over impulsive decisions.",
};

const panchang: Panchang = {
  tithi: "Shukla Paksha Panchami",
  nakshatra: "Rohini",
  yoga: "Siddhi",
  guidance:
    "A constructive day for patient planning and practical beginnings.",
};

export const mockContextRouter = Router();

const notFound = (requestId: string) => ({
  error: {
    code: "NOT_FOUND",
    message: "Resource not found.",
    requestId,
  },
});

mockContextRouter.get(
  ["/users/:userId", "/api/mock/users/:userId"],
  (req, res) => {
    if (req.params.userId !== userProfile.id)
      return res.status(404).json(notFound(res.locals.requestId));
    return res.json(userProfile);
  },
);

mockContextRouter.get(
  ["/kundli/:userId", "/api/mock/kundli/:userId"],
  (req, res) => {
    if (req.params.userId !== kundli.userId)
      return res.status(404).json(notFound(res.locals.requestId));
    return res.json(kundli);
  },
);

mockContextRouter.get(
  ["/horoscope/:userId", "/api/mock/horoscope/:userId"],
  (req, res) => {
    if (req.params.userId !== horoscope.userId)
      return res.status(404).json(notFound(res.locals.requestId));
    return res.json(horoscope);
  },
);

mockContextRouter.get(["/panchang", "/api/mock/panchang"], (_req, res) =>
  res.json(panchang),
);
