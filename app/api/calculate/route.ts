// app/api/calculate/route.ts
import { NextResponse, NextRequest } from "next/server";
import { calculateROCBobots } from "../../../lib/roc";
import { runTOPSIS } from "../../../lib/topsis";
import { CriteriaType, TOPSISInputData } from "../../../types"; // Import tipe

export async function POST(req: NextRequest) {
  try {
    const {
      alternatives,
      criteria,
      values,
      criteriaTypes,
      prioritizedCriteria,
      recaptchaToken,
    } = await req.json();

    // reCAPTCHA verification
    if (!recaptchaToken) {
      return NextResponse.json(
        { message: "reCAPTCHA token is missing." },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not defined.");
      return NextResponse.json(
        { message: "Server configuration error: reCAPTCHA secret key missing." },
        { status: 500 }
      );
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
    const recaptchaResponse = await fetch(verificationUrl, {
      method: "POST",
    });

    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success) { // reCAPTCHA v2 only checks for success
      console.error("reCAPTCHA verification failed:", recaptchaData);
      return NextResponse.json(
        { message: "reCAPTCHA verification failed. Please complete the challenge." },
        { status: 403 }
      );
    }

    // Validasi dasar
    if (
      !alternatives ||
      !Array.isArray(alternatives) ||
      alternatives.length === 0
    ) {
      return NextResponse.json(
        { message: "Missing or invalid alternatives data." },
        { status: 400 }
      );
    }
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json(
        { message: "Missing or invalid criteria data." },
        { status: 400 }
      );
    }
    if (
      !values ||
      !Array.isArray(values) ||
      values.length === 0 ||
      !Array.isArray(values[0]) ||
      values[0].length === 0
    ) {
      return NextResponse.json(
        { message: "Missing or invalid values matrix data." },
        { status: 400 }
      );
    }
    if (
      !criteriaTypes ||
      !Array.isArray(criteriaTypes) ||
      criteriaTypes.length !== criteria.length
    ) {
      return NextResponse.json(
        { message: "Missing or invalid criteriaTypes data." },
        { status: 400 }
      );
    }
    if (
      !prioritizedCriteria ||
      !Array.isArray(prioritizedCriteria) ||
      prioritizedCriteria.length !== criteria.length
    ) {
      return NextResponse.json(
        { message: "Missing or incomplete prioritizedCriteria data." },
        { status: 400 }
      );
    }

    // Pastikan criteriaTypes adalah array string yang valid dan sesuai dengan CriteriaType
    const mappedCriteriaTypes: CriteriaType[] = criteriaTypes.map(
      (type: string) => {
        if (type === "benefit" || type === "cost") {
          return type as CriteriaType;
        }
        // Jika ada tipe yang tidak valid, lempar error agar API Route mengembalikan 500
        throw new Error(
          `Invalid criteria type received: ${type}. Expected 'benefit' or 'cost'.`
        );
      }
    );

    const rocWeights = calculateROCBobots(prioritizedCriteria);

    // Pastikan semua kriteria memiliki bobot setelah ROC
    for (const crit of criteria) {
      if (rocWeights[crit] === undefined || isNaN(rocWeights[crit])) {
        throw new Error(
          `ROC weight for criterion '${crit}' is undefined or NaN. Check prioritized criteria.`
        );
      }
    }

    const topsisData: TOPSISInputData = {
      alternatives,
      criteria,
      values,
      criteriaTypes: mappedCriteriaTypes, // Pastikan ini sesuai dengan tipe yang diharapkan TOPSIS
      weights: rocWeights,
    };

    const rankingResults = runTOPSIS(topsisData);

    return NextResponse.json({ ranking: rankingResults });
  } catch (error: unknown) {
    // Ganti 'any' dengan 'unknown'
    console.error("API Error:", error);
    let errorMessage = "Unknown error occurred.";
    if (error instanceof Error) {
      // Periksa apakah error adalah instance dari Error
      errorMessage = error.message;
    } else if (typeof error === "string") {
      // Atau jika itu string
      errorMessage = error;
    }
    return NextResponse.json(
      { message: "Calculation failed", error: errorMessage },
      { status: 500 }
    );
  }
}
