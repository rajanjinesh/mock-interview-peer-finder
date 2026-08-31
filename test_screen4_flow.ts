import { createClient } from '@supabase/supabase-js';
import { findAndRankPeers } from './src/lib/matchingSystem';

const supabase = createClient('https://gjjjlfddejnjsnweurgj.supabase.co', 'sb_publishable_V0eGPmE_PDgN_N1613fHqw_Oa1B-dpg');

async function runScreen4FlowTest() {
  console.log("==================================================");
  console.log("RUNNING AUTOMATED SCREEN 4 INTEGRATION TEST");
  console.log("==================================================\n");

  // 1. Candidate Intake Requirements
  const userReq = {
    target_role: 'Product Manager',
    seniority_level: 'Senior',
    interview_type: 'Product Design',
    domain_skills: ['Fintech', 'Metrics'],
    availability: ['Weekday Evenings', 'Weekend Afternoon']
  };

  console.log("Step 1: Inserting Candidate Requirement...");
  const { data: reqData, error: reqErr } = await supabase
    .from('candidate_requirements')
    .insert({
      ...userReq,
      status: 'pending'
    })
    .select()
    .single();

  if (reqErr || !reqData) {
    console.error("Failed to insert candidate requirement:", reqErr);
    process.exit(1);
  }
  console.log(`Candidate Requirement Created. ID: ${reqData.id}\n`);

  // 2. Matching System
  console.log("Step 2: Executing Matching System...");
  const matchingRes = await findAndRankPeers(userReq);
  console.log(`Matching Status: ${matchingRes.status} | Matches Found: ${matchingRes.matches.length}`);
  const selectedMatch = matchingRes.matches[0];
  console.log(`Selected Peer: ${selectedMatch.peer_profile.full_name} (${selectedMatch.match_score}% Score)\n`);

  // 3. Initiate Peer Request (Screen 4A)
  console.log("Step 3: Initiating Peer Request (Screen 4A)...");
  const { data: interaction, error: intErr } = await supabase
    .from('peer_interactions')
    .insert({
      match_request_id: reqData.id,
      peer_id: selectedMatch.peer_profile.id,
      status: 'requested'
    })
    .select()
    .single();

  if (intErr || !interaction) {
    console.error("Failed to create peer interaction:", intErr);
    process.exit(1);
  }
  console.log(`Interaction Created. ID: ${interaction.id} | Status: ${interaction.status}`);
  console.log(`Displayed Message: "Request sent. We'll reach out to your selected peer for approval."\n`);

  // 4. Simulate Peer Approval (Screen 4B)
  console.log("Step 4: Simulating Peer Approval (Screen 4B)...");
  const { data: approvedInt, error: appErr } = await supabase
    .from('peer_interactions')
    .update({ status: 'approved' })
    .eq('id', interaction.id)
    .select()
    .single();

  if (appErr || !approvedInt) {
    console.error("Failed to update approval status:", appErr);
    process.exit(1);
  }
  console.log(`Interaction Approved. ID: ${approvedInt.id} | Status: ${approvedInt.status}`);
  console.log(`Common Available Slots: ${selectedMatch.common_availability.join(', ')}\n`);

  // 5. Select Slot & Schedule Mock Interview (Screen 4C)
  const chosenSlot = selectedMatch.common_availability[0] || 'Weekday Evenings';
  console.log(`Step 5: Scheduling Mock Interview with CTA 'Schedule Mock Interview' for slot '${chosenSlot}'...`);
  const { data: scheduledInt, error: schErr } = await supabase
    .from('peer_interactions')
    .update({
      status: 'scheduled',
      scheduled_at: new Date().toISOString()
    })
    .eq('id', interaction.id)
    .select()
    .single();

  if (schErr || !scheduledInt) {
    console.error("Failed to schedule interview:", schErr);
    process.exit(1);
  }

  console.log(`Interaction Scheduled. ID: ${scheduledInt.id} | Status: ${scheduledInt.status} | Scheduled Slot: ${scheduledInt.scheduled_slot}`);
  console.log(`FINAL MVP STATE: Mock interview scheduled\n`);

  console.log("==================================================");
  console.log("SCREEN 4 END-TO-END FLOW TEST PASSED SUCCESSFULLY");
  console.log("==================================================");
}

runScreen4FlowTest();
