import { NextResponse } from 'next/server';
import { explainPeerMatches } from '@/lib/aiReasoning';
import { CandidateRequirementInput, PeerMatch } from '@/lib/matchingSystem';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userReq, matches }: { userReq: CandidateRequirementInput; matches: PeerMatch[] } = body;

    if (!userReq || !matches || !Array.isArray(matches)) {
      return NextResponse.json(
        { error: 'Invalid payload: userReq and matches array are required.' },
        { status: 400 }
      );
    }

    const matchesWithAI = await explainPeerMatches(userReq, matches);
    return NextResponse.json({ matches: matchesWithAI, success: true });
  } catch (err: any) {
    console.error('API route explain-match error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate AI match explanations.' },
      { status: 500 }
    );
  }
}
