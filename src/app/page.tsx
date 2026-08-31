'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { findAndRankPeers, MatchSystemResult, PeerMatch } from '@/lib/matchingSystem';

const ROLE_OPTIONS = [
  'Product Manager',
  'Software Engineer',
  'Data Engineer',
  'Engineering Manager',
  'UX Designer',
  'Other',
];

const SENIORITY_OPTIONS = ['Junior', 'Mid-Level', 'Senior', 'Lead'];

const INTERVIEW_TYPE_OPTIONS = [
  'Product Design',
  'System Design',
  'Coding',
  'Behavioral',
  'Product Strategy',
];

const SUGGESTED_SKILLS = [
  'Fintech',
  'Metrics',
  'Execution',
  'User Growth',
  'Product Strategy',
  'B2B SaaS',
  'Roadmapping',
  'Spark',
  'ETL Pipelines',
  'Data Warehousing',
  'Algorithms',
  'Distributed Systems',
  'Java',
  'People Management',
  'Org Design',
  'Conflict Resolution',
];

const TIME_SLOT_OPTIONS = [
  { id: 'Weekday Evenings', label: 'Weekday Evenings', detail: 'Mon–Fri, 5:00 PM – 9:00 PM' },
  { id: 'Weekend Morning', label: 'Weekend Morning', detail: 'Sat–Sun, 8:00 AM – 12:00 PM' },
  { id: 'Weekend Afternoon', label: 'Weekend Afternoon', detail: 'Sat–Sun, 12:00 PM – 5:00 PM' },
  { id: 'Weekend Evening', label: 'Weekend Evening', detail: 'Sat–Sun, 5:00 PM – 9:00 PM' },
  { id: 'Weekday Mornings', label: 'Weekday Mornings', detail: 'Mon–Fri, 8:00 AM – 12:00 PM' },
  { id: 'Weekday Afternoons', label: 'Weekday Afternoons', detail: 'Mon–Fri, 12:00 PM – 5:00 PM' },
];

const MOCK_MATCH_DATA = [
  {
    id: 'peer-1',
    rank: 1,
    peer_profile: {
      full_name: 'Alex Chen',
      target_role: 'Product Manager',
      seniority_level: 'Senior',
      interview_type: 'Product Design',
      domain_skills: ['Fintech', 'Metrics', 'User Growth'],
    },
    match_score: 95,
    common_availability: ['Weekday Evenings', 'Weekend Afternoon'],
    ai_explanation: {
      why_suitable:
        'Alex is a Senior Product Manager with strong Fintech domain expertise. Their background in user metrics and product design aligns exceptionally well with your targeted interview type.',
      key_strengths: [
        'Direct domain alignment in Fintech & Product Metrics',
        'Matching seniority level (Senior PM)',
        'Overlapping availability on Weekday Evenings',
      ],
      trade_offs_gaps: [
        'Slightly less emphasis on B2B enterprise strategy',
        'Available primarily during late evening hours',
      ],
    },
  },
  {
    id: 'peer-2',
    rank: 2,
    peer_profile: {
      full_name: 'Priya Sharma',
      target_role: 'Product Manager',
      seniority_level: 'Senior',
      interview_type: 'Product Design',
      domain_skills: ['Execution', 'B2B SaaS', 'Metrics'],
    },
    match_score: 88,
    common_availability: ['Weekend Morning', 'Weekday Mornings'],
    ai_explanation: {
      why_suitable:
        'Priya brings extensive experience in Product Execution and B2B SaaS frameworks. They offer excellent constructive feedback for product design case studies.',
      key_strengths: [
        'Strong B2B SaaS & execution methodology focus',
        'High overlap on product design interview structure',
      ],
      trade_offs_gaps: [
        'Domain focus leans more towards B2B than consumer Fintech',
      ],
    },
  },
  {
    id: 'peer-3',
    rank: 3,
    peer_profile: {
      full_name: 'Marcus Vance',
      target_role: 'Product Manager',
      seniority_level: 'Mid-Level',
      interview_type: 'Product Design',
      domain_skills: ['Fintech', 'Product Strategy'],
    },
    match_score: 79,
    common_availability: ['Weekday Evenings'],
    ai_explanation: {
      why_suitable:
        'Marcus has active Fintech interview experience and strong product strategy skills, providing a great peer partner for core case practice.',
      key_strengths: [
        'Active Fintech domain practitioner',
        'Identical target interview format (Product Design)',
      ],
      trade_offs_gaps: [
        'Slight seniority difference (Mid-Level vs Senior)',
        'Fewer overlapping availability windows',
      ],
    },
  },
];

export default function MockInterviewPeerFinderApp() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [matchCountView, setMatchCountView] = useState<number>(3);
  const [requestedPeerId, setRequestedPeerId] = useState<string | null>(null);

  const [targetRole, setTargetRole] = useState<string>('Product Manager');
  const [customRole, setCustomRole] = useState<string>('');
  const [seniorityLevel, setSeniorityLevel] = useState<string>('Senior');
  const [interviewType, setInterviewType] = useState<string>('Product Design');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Fintech', 'Metrics']);
  const [customSkillInput, setCustomSkillInput] = useState<string>('');

  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([
    'Weekday Evenings',
    'Weekend Morning',
  ]);
  const [customSlotInput, setCustomSlotInput] = useState<string>('');

  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorsStep1, setErrorsStep1] = useState<Record<string, string>>({});
  const [errorsStep2, setErrorsStep2] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [isScreen2Complete, setIsScreen2Complete] = useState<boolean>(false);
  const [completedRecord, setCompletedRecord] = useState<any | null>(null);
  const [matchSystemResult, setMatchSystemResult] = useState<MatchSystemResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Screen 4 & Alternate States State
  const [selectedPeerForRequest, setSelectedPeerForRequest] = useState<any | null>(null);
  const [interactionStatus, setInteractionStatus] = useState<'REQUESTED' | 'APPROVED' | 'SCHEDULED' | 'DECLINED'>('REQUESTED');
  const [selectedScheduledSlot, setSelectedScheduledSlot] = useState<string>('');
  const [interactionRecordId, setInteractionRecordId] = useState<string | null>(null);
  const [isProcessingInteraction, setIsProcessingInteraction] = useState<boolean>(false);
  const [isNotificationSubscribed, setIsNotificationSubscribed] = useState<boolean>(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      setCustomSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const toggleAvailabilitySlot = (slotId: string) => {
    setSelectedAvailability((prev) =>
      prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]
    );
  };

  const handleAddCustomSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSlotInput.trim();
    if (trimmed && !selectedAvailability.includes(trimmed)) {
      setSelectedAvailability((prev) => [...prev, trimmed]);
      setCustomSlotInput('');
    }
  };

  const removeAvailabilitySlot = (slotToRemove: string) => {
    setSelectedAvailability((prev) => prev.filter((s) => s !== slotToRemove));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    const effectiveRole = targetRole === 'Other' ? customRole.trim() : targetRole;
    if (!effectiveRole) newErrors.targetRole = 'Please specify your target role.';
    if (!seniorityLevel) newErrors.seniorityLevel = 'Please select a seniority level.';
    if (!interviewType) newErrors.interviewType = 'Please select an interview type.';
    if (selectedSkills.length === 0) newErrors.skills = 'Please select or add at least one domain skill.';
    setErrorsStep1(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateStep1()) return;

    setIsSubmitting(true);
    const finalRole = targetRole === 'Other' ? customRole.trim() : targetRole;

    try {
      if (requestId) {
        const { data, error } = await supabase
          .from('candidate_requirements')
          .update({
            target_role: finalRole,
            seniority_level: seniorityLevel,
            interview_type: interviewType,
            domain_skills: selectedSkills,
          })
          .eq('id', requestId)
          .select()
          .single();

        if (error) throw error;
        if (data) setRequestId(data.id);
      } else {
        const { data, error } = await supabase
          .from('candidate_requirements')
          .insert({
            target_role: finalRole,
            seniority_level: seniorityLevel,
            interview_type: interviewType,
            domain_skills: selectedSkills,
            availability: [],
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setRequestId(data.id);
      }

      setCurrentStep(2);
    } catch (err: any) {
      console.error('Error saving profile intake:', err);
      setServerError(err.message || 'Failed to save profile intake. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (selectedAvailability.length === 0) {
      newErrors.availability = 'Please select at least one preferred practice time slot.';
    }
    setErrorsStep2(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFindSuitableMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateStep2()) return;

    setIsSubmitting(true);

    try {
      const finalRole = targetRole === 'Other' ? customRole.trim() : targetRole;
      let recordData: any = null;

      if (requestId) {
        const { data, error } = await supabase
          .from('candidate_requirements')
          .update({
            target_role: finalRole,
            seniority_level: seniorityLevel,
            interview_type: interviewType,
            domain_skills: selectedSkills,
            availability: selectedAvailability,
            status: 'pending',
          })
          .eq('id', requestId)
          .select()
          .single();

        if (error) throw error;
        recordData = data;
      } else {
        const { data, error } = await supabase
          .from('candidate_requirements')
          .insert({
            target_role: finalRole,
            seniority_level: seniorityLevel,
            interview_type: interviewType,
            domain_skills: selectedSkills,
            availability: selectedAvailability,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        recordData = data;
        setRequestId(data.id);
      }

      setCompletedRecord(recordData);
      setIsScreen2Complete(true);

      // Invoke Matching System (WHO)
      const userReqPayload = {
        target_role: finalRole,
        seniority_level: seniorityLevel,
        interview_type: interviewType,
        domain_skills: selectedSkills,
        availability: selectedAvailability,
      };

      const matchingRes = await findAndRankPeers(userReqPayload);
      setMatchSystemResult(matchingRes);
      setCurrentStep(3);

      // Background AI Explanation Layer (WHY)
      if (matchingRes.status === 'SUCCESS' && matchingRes.matches.length > 0) {
        setIsAiLoading(true);
        fetch('/api/explain-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userReq: userReqPayload, matches: matchingRes.matches }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.matches)) {
              setMatchSystemResult((prev) =>
                prev ? { ...prev, matches: data.matches } : prev
              );
            }
          })
          .catch((err) => {
            console.error('Background AI Reasoning fetch error:', err);
          })
          .finally(() => {
            setIsAiLoading(false);
          });
      }
    } catch (err: any) {
      console.error('Error saving availability:', err);
      setServerError(err.message || 'Failed to save availability choices. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiatePeerRequest = async (matchObj: any) => {
    setSelectedPeerForRequest(matchObj);
    setInteractionStatus('REQUESTED');
    const defaultSlot = matchObj.common_availability && matchObj.common_availability.length > 0
      ? matchObj.common_availability[0]
      : (selectedAvailability[0] || 'Weekday Evenings');
    setSelectedScheduledSlot(defaultSlot);

    try {
      const peerId = matchObj.peer_profile?.id || matchObj.id;
      if (requestId && peerId) {
        const { data, error } = await supabase
          .from('peer_interactions')
          .insert({
            match_request_id: requestId,
            peer_id: peerId,
            status: 'requested',
          })
          .select()
          .single();

        if (data) setInteractionRecordId(data.id);
      }
    } catch (err) {
      console.error('Error saving interaction in Supabase:', err);
    }

    setCurrentStep(4);
  };

  const handleSimulatePeerApproval = async () => {
    setIsProcessingInteraction(true);
    try {
      if (interactionRecordId) {
        await supabase
          .from('peer_interactions')
          .update({ status: 'approved' })
          .eq('id', interactionRecordId);
      }
      setInteractionStatus('APPROVED');
    } catch (err) {
      console.error('Error updating approval status:', err);
    } finally {
      setIsProcessingInteraction(false);
    }
  };

  const handleSimulatePeerDecline = async () => {
    setIsProcessingInteraction(true);
    try {
      if (interactionRecordId) {
        await supabase
          .from('peer_interactions')
          .update({
            status: 'declined',
            decline_reason: 'Peer schedule conflict',
          })
          .eq('id', interactionRecordId);
      }
      setInteractionStatus('DECLINED');
    } catch (err) {
      console.error('Error updating decline status:', err);
    } finally {
      setIsProcessingInteraction(false);
    }
  };

  const handleScheduleMockInterview = async () => {
    if (!selectedScheduledSlot) return;
    setIsProcessingInteraction(true);
    try {
      if (interactionRecordId) {
        await supabase
          .from('peer_interactions')
          .update({
            status: 'scheduled',
            scheduled_at: new Date().toISOString(),
          })
          .eq('id', interactionRecordId);
      }
      setInteractionStatus('SCHEDULED');
    } catch (err) {
      console.error('Error scheduling interview:', err);
    } finally {
      setIsProcessingInteraction(false);
    }
  };

  const displayedMatches = MOCK_MATCH_DATA.slice(0, matchCountView);

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl p-6 sm:p-10">
        
        <div className="border-b border-slate-200 pb-6 mb-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span
                onClick={() => setCurrentStep(1)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                  currentStep === 1
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Step 1: Profile Intake
              </span>
              <span className="text-slate-300">→</span>
              <span
                onClick={() => setCurrentStep(2)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                  currentStep === 2
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Step 2: Availability
              </span>
              <span className="text-slate-300">→</span>
              <span
                onClick={() => setCurrentStep(3)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                  currentStep === 3
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Step 3: Top 3 Matches
              </span>
              <span className="text-slate-300">→</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  currentStep === 4
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
              >
                Step 4: Request & Schedule
              </span>
            </div>

            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Mock Interview Peer Finder
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {currentStep === 1 && 'Interview Requirements Intake'}
            {currentStep === 2 && 'Set Your Practice Availability'}
            {currentStep === 3 && 'Top Suitable Peer Matches'}
            {currentStep === 4 && 'Request & Schedule Mock Interview'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            {currentStep === 1 &&
              'Provide details of the interview you are preparing for. These criteria will be used to determine suitable peer matches.'}
            {currentStep === 2 &&
              'Select the days and time slots when you are available for mock interview practice sessions.'}
            {currentStep === 3 &&
              'Below are the top suitable peers for your interview requirements. Review their match strength, common availability, and suitability explanations.'}
            {currentStep === 4 &&
              'Request approval from your selected peer, view common available time slots, and schedule your mock interview session.'}
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-8">
            <div>
              <label htmlFor="target_role" className="block text-sm font-medium text-slate-900 mb-1">
                1. Target Role <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                The exact job role you are preparing to interview for.
              </p>
              <select
                id="target_role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {targetRole === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter custom role title..."
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}

              {errorsStep1.targetRole && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errorsStep1.targetRole}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                2. Seniority Level <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Select your targeted experience level.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SENIORITY_OPTIONS.map((level) => {
                  const isSelected = seniorityLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSeniorityLevel(level)}
                      className={`py-2.5 px-4 rounded-lg text-sm font-medium border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              {errorsStep1.seniorityLevel && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errorsStep1.seniorityLevel}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                3. Interview Type <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                The specific format or domain of interview you want to practice.
              </p>
              <div className="flex flex-wrap gap-2.5">
                {INTERVIEW_TYPE_OPTIONS.map((type) => {
                  const isSelected = interviewType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInterviewType(type)}
                      className={`py-2 px-4 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {errorsStep1.interviewType && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errorsStep1.interviewType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                4. Domain / Key Skills <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Select key domains or skills relevant to your interview.
              </p>

              {selectedSkills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500 w-full mb-1">
                    Selected Skills ({selectedSkills.length}):
                  </span>
                  {selectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-indigo-600 hover:text-indigo-900 font-bold focus:outline-none cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTED_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom skill..."
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Add Skill
                </button>
              </div>

              {errorsStep1.skills && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errorsStep1.skills}</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-400">* Required fields</p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Saving Profile...' : 'Set My Availability →'}
              </button>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Your Interview Requirements (From Screen 1)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsScreen2Complete(false);
                    setCurrentStep(1);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                >
                  Edit Profile Requirements
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Role</span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {targetRole === 'Other' ? customRole : targetRole}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Seniority</span>
                  <span className="font-semibold text-slate-900 truncate block">{seniorityLevel}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Interview Format</span>
                  <span className="font-semibold text-slate-900 truncate block">{interviewType}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Skills ({selectedSkills.length})</span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {selectedSkills.slice(0, 2).join(', ')}
                    {selectedSkills.length > 2 ? ` +${selectedSkills.length - 2}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {isScreen2Complete && completedRecord ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-semibold text-emerald-900">
                      Requirements & Availability Preserved!
                    </h3>
                    <p className="mt-1 text-sm text-emerald-700">
                      All structured input has been stored under Request ID:{' '}
                      <span className="font-mono font-semibold">{completedRecord.id}</span>
                    </p>

                    <div className="mt-4 bg-white/90 border border-emerald-100 rounded-lg p-4 text-xs text-slate-800 space-y-1.5">
                      <div>
                        <span className="font-semibold text-slate-900">Target Role:</span>{' '}
                        {completedRecord.target_role} ({completedRecord.seniority_level})
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Interview Type:</span>{' '}
                        {completedRecord.interview_type}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Domain Skills:</span>{' '}
                        {Array.isArray(completedRecord.domain_skills)
                          ? completedRecord.domain_skills.join(', ')
                          : ''}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Selected Practice Availability:</span>{' '}
                        {Array.isArray(completedRecord.availability)
                          ? completedRecord.availability.join(', ')
                          : ''}
                      </div>
                    </div>

                    <div className="mt-5 p-3 bg-emerald-100/80 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                      <span className="font-medium">
                        ✓ Screen 2 Complete. Input ready for PROMPT 4: Matching System.
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsScreen2Complete(false)}
                        className="text-xs text-emerald-800 hover:text-emerald-950 underline font-semibold cursor-pointer"
                      >
                        Modify Availability
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFindSuitableMatches} className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Preferred Practice Time Slots <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Select all days and time windows when you are free for mock interview sessions.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {TIME_SLOT_OPTIONS.map((slot) => {
                      const isSelected = selectedAvailability.includes(slot.id);
                      return (
                        <div
                          key={slot.id}
                          onClick={() => toggleAvailabilitySlot(slot.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{slot.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{slot.detail}</div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedAvailability.length > 0 && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-semibold text-slate-500 block mb-1.5">
                        Selected Time Slots ({selectedAvailability.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedAvailability.map((slotId) => (
                          <span
                            key={slotId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                          >
                            {slotId}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAvailabilitySlot(slotId);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 font-bold focus:outline-none cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom time slot (e.g. Weekdays 9-10 PM)..."
                      value={customSlotInput}
                      onChange={(e) => setCustomSlotInput(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSlot}
                      className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                      Add Slot
                    </button>
                  </div>

                  {errorsStep2.availability && (
                    <p className="mt-2 text-xs text-red-600 font-medium">
                      {errorsStep2.availability}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                  >
                    ← Back to Profile Intake
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving Preferences...
                      </>
                    ) : (
                      'Find Suitable Matches'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: TOP 3 MATCHES                                  */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Active Request Criteria
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {targetRole === 'Other' ? customRole : targetRole} ({seniorityLevel}) • {interviewType}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-400 px-2 font-medium">Test View:</span>
                <button
                  type="button"
                  onClick={() => setMatchCountView(3)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    matchCountView === 3
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  3 Matches
                </button>
                <button
                  type="button"
                  onClick={() => setMatchCountView(2)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    matchCountView === 2
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  2 Matches
                </button>
                <button
                  type="button"
                  onClick={() => setMatchCountView(1)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    matchCountView === 1
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  1 Match
                </button>
              </div>
            </div>

            {requestedPeerId && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900">
                      Peer Interaction Requested
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Request initiated for peer ID <span className="font-mono">{requestedPeerId}</span>. Ready for later Request & Scheduling flow.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRequestedPeerId(null)}
                  className="text-xs text-emerald-800 hover:text-emerald-950 underline font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ALTERNATE STATE 1: NO SUITABLE MATCH */}
            {matchSystemResult && matchSystemResult.status === 'NO_MATCH' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-5">
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-2xl font-extrabold shadow-xs">
                  !
                </div>
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wider">
                    Alternate State 1
                  </span>
                  <h3 className="text-2xl font-extrabold text-amber-950">
                    No suitable match found right now.
                  </h3>
                  <p className="text-sm text-amber-800 max-w-md mx-auto leading-relaxed">
                    No active peers currently match both your target role (<span className="font-semibold">{targetRole === 'Other' ? customRole : targetRole}</span>) and interview type (<span className="font-semibold">{interviewType}</span>).
                  </p>
                </div>

                {isNotificationSubscribed ? (
                  <div className="bg-white border border-amber-200 p-4 rounded-xl max-w-md mx-auto text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                    Notification preference saved! We will notify you when a matching peer registers.
                  </div>
                ) : (
                  <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-3">
                    {/* CTA 1: Widen My Search */}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Widen My Search
                    </button>

                    {/* CTA 2: Notify Me When Available */}
                    <button
                      type="button"
                      onClick={() => setIsNotificationSubscribed(true)}
                      className="w-full sm:w-auto px-6 py-3 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold transition-all border border-amber-300 shadow-2xs cursor-pointer"
                    >
                      Notify Me When Available
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* DYNAMIC TOP MATCH CARDS LIST */
              <div className="space-y-6">
                {(matchSystemResult && matchSystemResult.matches.length > 0
                  ? matchSystemResult.matches
                  : displayedMatches
                ).slice(0, matchCountView).map((match: any) => (
                  <div
                    key={match.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:border-slate-300 transition-all space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            #{match.rank} Match
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {match.peer_profile.seniority_level} {match.peer_profile.target_role}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {match.peer_profile.full_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">Match Strength</span>
                          <span className="text-lg font-extrabold text-emerald-600">
                            {match.match_score}%
                          </span>
                        </div>
                        <div className="w-12 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2.5 rounded-full"
                            style={{ width: `${match.match_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Common Availability:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {match.common_availability && match.common_availability.length > 0 ? (
                          match.common_availability.map((slot: string) => (
                            <span
                              key={slot}
                              className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs"
                            >
                              {slot}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 font-italic">No overlapping slot</span>
                        )}
                      </div>
                    </div>

                    {/* Structured Factors Breakdown */}
                    {match.matching_factors && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
                        <span className="font-bold text-slate-900 block mb-1">Structured Match Factors (Matching System):</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div><span className="text-slate-400">Target Role:</span> <span className="font-semibold text-emerald-700">✓ Exact (25 pts)</span></div>
                          <div><span className="text-slate-400">Interview Type:</span> <span className="font-semibold text-emerald-700">✓ Exact (25 pts)</span></div>
                          <div><span className="text-slate-400">Seniority:</span> <span className="font-semibold text-slate-800">{match.matching_factors.seniority_match_type === 'exact' ? '✓ Exact (20 pts)' : match.matching_factors.seniority_match_type === 'adjacent' ? '✓ Adjacent (10 pts)' : 'Different (0 pts)'}</span></div>
                          <div><span className="text-slate-400">Skills Overlap:</span> <span className="font-semibold text-slate-800">{match.matching_factors.common_skills.length} matching</span></div>
                        </div>
                      </div>
                    )}

                    {/* AI Explanation Area (Placeholder for Gemini AI in PROMPT 6) */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                            AI Match Reasoning (Gemini API)
                          </span>
                        </div>
                        {isAiLoading && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 animate-pulse">
                            <svg className="animate-spin h-3 w-3 text-indigo-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Generating AI Explanation...
                          </span>
                        )}
                        {!isAiLoading && match.ai_status === 'SUCCESS' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ AI Verified
                          </span>
                        )}
                        {!isAiLoading && match.ai_status === 'UNAVAILABLE' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            AI Offline (Match Valid)
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                          Why this person is suitable:
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed font-normal">
                          {match.ai_explanation?.why_suitable ||
                            `${match.peer_profile.full_name} matches your target role (${match.peer_profile.target_role}) and interview format (${match.peer_profile.interview_type}). Detailed natural-language match explanation will be generated by Gemini API.`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="bg-white border border-emerald-100 rounded-lg p-3">
                          <h5 className="text-xs font-bold text-emerald-800 flex items-center gap-1 mb-1.5">
                            <span>✓</span> Key Strengths:
                          </h5>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {(match.ai_explanation?.key_strengths || [
                              `Direct role alignment: ${match.peer_profile.target_role}`,
                              `Exact format match: ${match.peer_profile.interview_type}`,
                              `Seniority level: ${match.peer_profile.seniority_level}`,
                            ]).map((str: string, idx: number) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-white border border-amber-100 rounded-lg p-3">
                          <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1 mb-1.5">
                            <span>!</span> Trade-offs & Gaps:
                          </h5>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {(match.ai_explanation?.trade_offs_gaps || [
                              `Peer availability slots: ${match.peer_profile.availability?.join(', ')}`,
                            ]).map((gap: string, idx: number) => (
                              <li key={idx}>{gap}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Format: {match.peer_profile.interview_type}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInitiatePeerRequest(match)}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs cursor-pointer"
                      >
                        Request This Peer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                ← Back to Availability
              </button>

              <span className="text-xs font-medium text-slate-400">
                Screen 3 Complete. Top 3 Matches displayed.
              </span>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: REQUEST & SCHEDULE                              */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <div className="space-y-8">
            {/* Peer Selected Summary Header */}
            {selectedPeerForRequest ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {selectedPeerForRequest.peer_profile?.full_name?.[0] || 'P'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                      Selected Practice Peer
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedPeerForRequest.peer_profile?.full_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedPeerForRequest.peer_profile?.seniority_level} {selectedPeerForRequest.peer_profile?.target_role} • {selectedPeerForRequest.peer_profile?.interview_type}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg text-right">
                  <span className="text-[11px] text-slate-400 font-medium block">Match Strength</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {selectedPeerForRequest.match_score}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
                No peer selected. Please return to Screen 3 to select a match.
              </div>
            )}

            {/* STEP 4A: REQUEST SENT (PENDING APPROVAL) */}
            {interactionStatus === 'REQUESTED' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    i
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-indigo-950">
                      Request sent. We'll reach out to your selected peer for approval.
                    </h3>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      Your interview request has been submitted to <span className="font-semibold">{selectedPeerForRequest?.peer_profile?.full_name}</span>. In a live environment, the peer receives a notification to approve or decline the session.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-indigo-100 rounded-xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">
                      Request Details
                    </span>
                    <span className="px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 text-[11px]">
                      Status: PENDING PEER APPROVAL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div><span className="text-slate-400">Target Role:</span> <span className="font-semibold">{targetRole === 'Other' ? customRole : targetRole}</span></div>
                    <div><span className="text-slate-400">Interview Type:</span> <span className="font-semibold">{interviewType}</span></div>
                    <div><span className="text-slate-400">Seniority:</span> <span className="font-semibold">{seniorityLevel}</span></div>
                    <div><span className="text-slate-400">Request Record ID:</span> <span className="font-mono text-[11px]">{interactionRecordId || 'Saved in Supabase'}</span></div>
                  </div>
                </div>

                {/* Simulation Trigger CTAs (Approval or Decline) */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-indigo-100">
                  <span className="text-xs text-indigo-700 font-medium">
                    ⚡ Prototype Simulation Mode:
                  </span>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSimulatePeerApproval}
                      disabled={isProcessingInteraction}
                      className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingInteraction ? 'Processing...' : 'Simulate Peer Approval →'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulatePeerDecline}
                      disabled={isProcessingInteraction}
                      className="flex-1 sm:flex-initial px-5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      Simulate Peer Decline ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ALTERNATE STATE 2: PEER DECLINES */}
            {interactionStatus === 'DECLINED' && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 space-y-6 text-center sm:text-left shadow-sm">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-rose-200 pb-6">
                  <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-2xl font-extrabold shadow-xs shrink-0">
                    !
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-rose-200 text-rose-900 uppercase tracking-wider mb-1">
                      Alternate State 2
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-rose-950 tracking-tight">
                      Your selected peer isn't available.
                    </h2>
                    <p className="text-sm text-rose-800 leading-relaxed">
                      Unfortunately, <span className="font-semibold">{selectedPeerForRequest?.peer_profile?.full_name}</span> is currently unable to accept practice mock interview requests.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-rose-100 rounded-xl p-5 space-y-3 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Next Recommended Step
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Your previous search results are preserved. You can select another top-ranked match from your suitable peer list.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* CTA: Choose Another Peer */}
                  <button
                    type="button"
                    onClick={() => {
                      setInteractionStatus('REQUESTED');
                      setSelectedPeerForRequest(null);
                      setCurrentStep(3);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Choose Another Peer →
                  </button>

                  <span className="text-xs text-rose-800 font-semibold">
                    Top 3 Matches Preserved (Matching System)
                  </span>
                </div>
              </div>
            )}

            {/* STEP 4B: PEER APPROVED - SELECT TIME SLOT */}
            {interactionStatus === 'APPROVED' && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-950">
                      Peer Approval Confirmed!
                    </h3>
                    <p className="text-xs text-emerald-800">
                      {selectedPeerForRequest?.peer_profile?.full_name} has accepted your request. Please select a common available practice time slot.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select Common Practice Time Slot
                  </h4>

                  {selectedPeerForRequest?.common_availability && selectedPeerForRequest.common_availability.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedPeerForRequest.common_availability.map((slot: string) => (
                        <label
                          key={slot}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                            selectedScheduledSlot === slot
                              ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="scheduled_slot"
                              value={slot}
                              checked={selectedScheduledSlot === slot}
                              onChange={() => setSelectedScheduledSlot(slot)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <span className="text-sm font-bold text-slate-900">{slot}</span>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Mutual Overlap
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-500 italic mb-2">
                        No direct mutual slot overlap found in profile default. Choose from available peer practice slots:
                      </p>
                      {(selectedPeerForRequest?.peer_profile?.availability || selectedAvailability).map((slot: string) => (
                        <label
                          key={slot}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                            selectedScheduledSlot === slot
                              ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="scheduled_slot"
                              value={slot}
                              checked={selectedScheduledSlot === slot}
                              onChange={() => setSelectedScheduledSlot(slot)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <span className="text-sm font-bold text-slate-900">{slot}</span>
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Peer Slot
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={handleScheduleMockInterview}
                      disabled={!selectedScheduledSlot || isProcessingInteraction}
                      className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingInteraction ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Scheduling...
                        </>
                      ) : (
                        'Schedule Mock Interview'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4C: FINAL MVP STATE - MOCK INTERVIEW SCHEDULED */}
            {interactionStatus === 'SCHEDULED' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 space-y-6 shadow-sm text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-emerald-200 pb-6">
                  <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white uppercase tracking-wider mb-1">
                      Final MVP State
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
                      Mock interview scheduled
                    </h2>
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      You are all set! Your practice mock interview session has been confirmed with your peer.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-emerald-100 rounded-xl p-6 space-y-4 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Confirmed Session Summary
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block mb-0.5">Matched Peer:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedPeerForRequest?.peer_profile?.full_name}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        {selectedPeerForRequest?.peer_profile?.seniority_level} {selectedPeerForRequest?.peer_profile?.target_role}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block mb-0.5">Scheduled Slot:</span>
                      <span className="font-bold text-indigo-700 text-sm">
                        {selectedScheduledSlot}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        Format: {interviewType}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block mb-0.5">Candidate Role:</span>
                      <span className="font-semibold text-slate-800">
                        {targetRole === 'Other' ? customRole : targetRole} ({seniorityLevel})
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 block mb-0.5">Database Interaction ID:</span>
                      <span className="font-mono text-[11px] text-slate-700 font-semibold">
                        {interactionRecordId || 'Saved in Supabase peer_interactions'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setInteractionStatus('REQUESTED');
                      setSelectedPeerForRequest(null);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    ← Practice Another Interview
                  </button>

                  <span className="text-xs text-emerald-800 font-semibold">
                    Core MVP Flow Complete. Session Ready.
                  </span>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                ← Back to Top 3 Matches
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
