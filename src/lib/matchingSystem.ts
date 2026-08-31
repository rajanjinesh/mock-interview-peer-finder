import { supabase } from '@/lib/supabaseClient';

export interface CandidateRequirementInput {
  target_role: string;
  seniority_level: string;
  interview_type: string;
  domain_skills: string[];
  availability: string[];
}

export interface PeerProfile {
  id: string;
  full_name: string;
  email?: string;
  target_role: string;
  seniority_level: string;
  interview_type: string;
  domain_skills: string[];
  availability: string[];
  status?: string;
}

export interface MatchingFactors {
  role_match: boolean;
  interview_type_match: boolean;
  seniority_match_type: 'exact' | 'adjacent' | 'different';
  common_skills: string[];
  common_availability: string[];
  role_points: number;
  interview_type_points: number;
  seniority_points: number;
  skills_points: number;
  availability_points: number;
}

export interface PeerMatch {
  id: string;
  rank: number;
  peer_profile: PeerProfile;
  match_score: number;
  common_availability: string[];
  matching_factors: MatchingFactors;
}

export interface MatchSystemResult {
  status: 'SUCCESS' | 'NO_MATCH' | 'ERROR';
  total_eligible_matches: number;
  matches: PeerMatch[];
  error_message?: string;
}

const SENIORITY_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Lead'];

function calculateSeniorityPoints(userLevel: string, peerLevel: string): { points: number; matchType: 'exact' | 'adjacent' | 'different' } {
  if (userLevel === peerLevel) {
    return { points: 20, matchType: 'exact' };
  }
  const userIdx = SENIORITY_LEVELS.indexOf(userLevel);
  const peerIdx = SENIORITY_LEVELS.indexOf(peerLevel);

  if (userIdx !== -1 && peerIdx !== -1 && Math.abs(userIdx - peerIdx) === 1) {
    return { points: 10, matchType: 'adjacent' };
  }

  return { points: 0, matchType: 'different' };
}

export function computePeerMatchScore(
  userReq: CandidateRequirementInput,
  peer: PeerProfile
): { matchScore: number; factors: MatchingFactors; commonAvailability: string[] } {
  const roleMatch = peer.target_role.trim().toLowerCase() === userReq.target_role.trim().toLowerCase();
  const interviewTypeMatch = peer.interview_type.trim().toLowerCase() === userReq.interview_type.trim().toLowerCase();

  if (!roleMatch || !interviewTypeMatch) {
    return {
      matchScore: 0,
      factors: {
        role_match: roleMatch,
        interview_type_match: interviewTypeMatch,
        seniority_match_type: 'different',
        common_skills: [],
        common_availability: [],
        role_points: 0,
        interview_type_points: 0,
        seniority_points: 0,
        skills_points: 0,
        availability_points: 0,
      },
      commonAvailability: [],
    };
  }

  const rolePoints = 25;
  const interviewTypePoints = 25;

  const { points: seniorityPoints, matchType: seniorityMatchType } = calculateSeniorityPoints(
    userReq.seniority_level,
    peer.seniority_level
  );

  const userSkillsSet = new Set((userReq.domain_skills || []).map((s) => s.trim().toLowerCase()));
  const peerSkills = peer.domain_skills || [];
  const commonSkills = peerSkills.filter((s) => userSkillsSet.has(s.trim().toLowerCase()));

  let skillsPoints = 0;
  if (userReq.domain_skills && userReq.domain_skills.length > 0) {
    const ratio = commonSkills.length / userReq.domain_skills.length;
    skillsPoints = Math.min(15, Math.round(ratio * 15));
  } else {
    skillsPoints = 15;
  }

  const userSlotsSet = new Set((userReq.availability || []).map((a) => a.trim().toLowerCase()));
  const peerAvailability = peer.availability || [];
  const commonAvailability = peerAvailability.filter((a) => userSlotsSet.has(a.trim().toLowerCase()));

  let availabilityPoints = 0;
  if (userReq.availability && userReq.availability.length > 0) {
    const ratio = commonAvailability.length / userReq.availability.length;
    availabilityPoints = Math.min(15, Math.round(ratio * 15));
  } else {
    availabilityPoints = 15;
  }

  const totalScore = Math.min(100, rolePoints + interviewTypePoints + seniorityPoints + skillsPoints + availabilityPoints);

  const factors: MatchingFactors = {
    role_match: true,
    interview_type_match: true,
    seniority_match_type: seniorityMatchType,
    common_skills: commonSkills,
    common_availability: commonAvailability,
    role_points: rolePoints,
    interview_type_points: interviewTypePoints,
    seniority_points: seniorityPoints,
    skills_points: skillsPoints,
    availability_points: availabilityPoints,
  };

  return {
    matchScore: totalScore,
    factors,
    commonAvailability,
  };
}

export function rankPeerProfiles(
  userReq: CandidateRequirementInput,
  peerProfiles: PeerProfile[]
): MatchSystemResult {
  try {
    const eligibleMatches: PeerMatch[] = [];

    for (const peer of peerProfiles) {
      if (peer.status && peer.status !== 'active' && peer.status !== 'available') {
        continue;
      }

      const { matchScore, factors, commonAvailability } = computePeerMatchScore(userReq, peer);

      if (factors.role_match && factors.interview_type_match) {
        eligibleMatches.push({
          id: peer.id,
          rank: 0,
          peer_profile: peer,
          match_score: matchScore,
          common_availability: commonAvailability,
          matching_factors: factors,
        });
      }
    }

    if (eligibleMatches.length === 0) {
      return {
        status: 'NO_MATCH',
        total_eligible_matches: 0,
        matches: [],
      };
    }

    eligibleMatches.sort((a, b) => {
      if (b.match_score !== a.match_score) {
        return b.match_score - a.match_score;
      }
      return a.peer_profile.full_name.localeCompare(b.peer_profile.full_name);
    });

    const topMatches = eligibleMatches.slice(0, 3).map((match, index) => ({
      ...match,
      rank: index + 1,
    }));

    return {
      status: 'SUCCESS',
      total_eligible_matches: eligibleMatches.length,
      matches: topMatches,
    };
  } catch (err: any) {
    return {
      status: 'ERROR',
      total_eligible_matches: 0,
      matches: [],
      error_message: err.message || 'Matching process encountered an error.',
    };
  }
}

export async function findAndRankPeers(
  userReq: CandidateRequirementInput
): Promise<MatchSystemResult> {
  try {
    const { data: peers, error } = await supabase.from('peer_profiles').select('*');

    if (error) {
      return {
        status: 'ERROR',
        total_eligible_matches: 0,
        matches: [],
        error_message: `Supabase retrieval failure: ${error.message}`,
      };
    }

    if (!peers || peers.length === 0) {
      return {
        status: 'NO_MATCH',
        total_eligible_matches: 0,
        matches: [],
      };
    }

    return rankPeerProfiles(userReq, peers as PeerProfile[]);
  } catch (err: any) {
    return {
      status: 'ERROR',
      total_eligible_matches: 0,
      matches: [],
      error_message: err.message || 'Database query error during matching.',
    };
  }
}
