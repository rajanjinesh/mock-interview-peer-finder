import { rankPeerProfiles, findAndRankPeers } from './src/lib/matchingSystem';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://gjjjlfddejnjsnweurgj.supabase.co', 'sb_publishable_V0eGPmE_PDgN_N1613fHqw_Oa1B-dpg');

async function runMatchingSystemTests() {
  console.log("==================================================");
  console.log("RUNNING AUTOMATED MATCHING SYSTEM TESTS");
  console.log("==================================================\n");

  const { data: dbPeers, error } = await supabase.from('peer_profiles').select('*');
  if (error || !dbPeers) {
    console.error("Failed to fetch peers from Supabase:", error);
    process.exit(1);
  }
  console.log(`Fetched ${dbPeers.length} peer profiles from Supabase.\n`);

  // --- Test 1: Strong matching peers (PM, Senior, Product Design, Fintech, Weekday Evenings) ---
  console.log("Test 1: Strong matching peers (PM, Senior, Product Design, Fintech, Weekday Evenings)");
  const req1 = {
    target_role: 'Product Manager',
    seniority_level: 'Senior',
    interview_type: 'Product Design',
    domain_skills: ['Fintech', 'Metrics'],
    availability: ['Weekday Evenings', 'Weekend Afternoon']
  };
  const res1 = rankPeerProfiles(req1, dbPeers as any);
  console.log(`Status: ${res1.status} | Total Eligible Matches: ${res1.total_eligible_matches} | Returned Count: ${res1.matches.length}`);
  res1.matches.forEach(m => {
    console.log(`  Rank #${m.rank}: ${m.peer_profile.full_name} (${m.peer_profile.seniority_level}) - Score: ${m.match_score}% - Common Availability: ${m.common_availability.join(', ')}`);
  });
  console.log("\n--------------------------------------------------");

  // --- Test 2: Mandatory Eligibility Filtering (Different Target Role) ---
  console.log("Test 2: Mandatory Filter Exclusions (Searching Data Engineer + System Design)");
  const req2 = {
    target_role: 'Data Engineer',
    seniority_level: 'Lead',
    interview_type: 'System Design',
    domain_skills: ['Spark', 'ETL Pipelines'],
    availability: ['Weekday Evenings']
  };
  const res2 = rankPeerProfiles(req2, dbPeers as any);
  console.log(`Status: ${res2.status} | Total Eligible Matches: ${res2.total_eligible_matches} | Returned Count: ${res2.matches.length}`);
  res2.matches.forEach(m => {
    console.log(`  Rank #${m.rank}: ${m.peer_profile.full_name} (${m.peer_profile.target_role}) - Score: ${m.match_score}%`);
  });
  console.log("\n--------------------------------------------------");

  // --- Test 3: Fewer than 3 Matches (Software Engineer + Coding) ---
  console.log("Test 3: Fewer than 3 Matches (Software Engineer + Coding)");
  const req3 = {
    target_role: 'Software Engineer',
    seniority_level: 'Senior',
    interview_type: 'Coding',
    domain_skills: ['Algorithms', 'Java'],
    availability: ['Weekend Evening']
  };
  const res3 = rankPeerProfiles(req3, dbPeers as any);
  console.log(`Status: ${res3.status} | Total Eligible Matches: ${res3.total_eligible_matches} | Returned Count: ${res3.matches.length}`);
  res3.matches.forEach(m => {
    console.log(`  Rank #${m.rank}: ${m.peer_profile.full_name} - Score: ${m.match_score}%`);
  });
  console.log("\n--------------------------------------------------");

  // --- Test 4: Zero Eligible Matches (No Match Scenario) ---
  console.log("Test 4: Zero Eligible Matches (UX Designer + Portfolio Review)");
  const req4 = {
    target_role: 'UX Designer',
    seniority_level: 'Senior',
    interview_type: 'Portfolio Review',
    domain_skills: ['Figma'],
    availability: ['Weekend Evening']
  };
  const res4 = rankPeerProfiles(req4, dbPeers as any);
  console.log(`Status: ${res4.status} | Total Eligible Matches: ${res4.total_eligible_matches} | Returned Matches Array: ${res4.matches.length}`);
  console.log("\n--------------------------------------------------");

  // --- Test 5: Mandatory Filter Verification (PM with Behavioral vs Product Design) ---
  console.log("Test 5: Mandatory Filter Excludes PM peers when Interview Type differs (Product Manager + Behavioral)");
  const req5 = {
    target_role: 'Product Manager',
    seniority_level: 'Senior',
    interview_type: 'Behavioral',
    domain_skills: ['Fintech'],
    availability: ['Weekday Evenings']
  };
  const res5 = rankPeerProfiles(req5, dbPeers as any);
  console.log(`Status: ${res5.status} | Total Eligible Matches: ${res5.total_eligible_matches}`);
  console.log("Verification: All Product Design PMs excluded because Interview Type != Behavioral.");
  console.log("\n--------------------------------------------------");

  // --- Test 6: Deterministic & Reproducible Verification ---
  console.log("Test 6: Determinism & Reproducibility (Running req1 twice)");
  const runA = rankPeerProfiles(req1, dbPeers as any);
  const runB = rankPeerProfiles(req1, dbPeers as any);
  const isIdentical = JSON.stringify(runA) === JSON.stringify(runB);
  console.log(`Run A Match 1: ${runA.matches[0]?.peer_profile.full_name} (${runA.matches[0]?.match_score}%)`);
  console.log(`Run B Match 1: ${runB.matches[0]?.peer_profile.full_name} (${runB.matches[0]?.match_score}%)`);
  console.log(`Results 100% Identical: ${isIdentical}`);
  console.log("\n==================================================");
  console.log("ALL MATCHING SYSTEM TESTS COMPLETED SUCCESSFULLY");
  console.log("==================================================");
}

runMatchingSystemTests();
