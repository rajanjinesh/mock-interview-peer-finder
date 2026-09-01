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

const SENIORITY_OPTIONS = [
  { label: 'Junior (0–2 years)', value: 'Junior' },
  { label: 'Mid-Level (3–5 years)', value: 'Mid-Level' },
  { label: 'Senior (6–10 years)', value: 'Senior' },
  { label: 'Leadership (10+ years)', value: 'Lead' },
];

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

  // UX Refinement States
  const [activeLinkedInModalPeer, setActiveLinkedInModalPeer] = useState<any | null>(null);
  const [activeResumeModalPeer, setActiveResumeModalPeer] = useState<any | null>(null);
  const [expandedAiCardMap, setExpandedAiCardMap] = useState<Record<string, boolean>>({});

  const toggleAiExplanationCollapse = (peerId: string) => {
    setExpandedAiCardMap((prev) => ({
      ...prev,
      [peerId]: !prev[peerId],
    }));
  };

  const [showSkillLimitNotice, setShowSkillLimitNotice] = useState<boolean>(false);
  const [skillSelectChoice, setSkillSelectChoice] = useState<string>('');

  const handleAddSkillFromChoice = (skillToAdd: string) => {
    setShowSkillLimitNotice(false);
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;

    if (selectedSkills.includes(trimmed)) {
      setSkillSelectChoice('');
      setCustomSkillInput('');
      return;
    }

    if (selectedSkills.length >= 2) {
      setShowSkillLimitNotice(true);
      return;
    }

    setSelectedSkills((prev) => [...prev, trimmed]);
    setCustomSkillInput('');
    setSkillSelectChoice('');
  };

  const removeSkill = (skillToRemove: string) => {
    setShowSkillLimitNotice(false);
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
      <div className="max-w-5xl mx-auto bg-white shadow-md border border-slate-200 rounded-2xl p-6 sm:p-12 space-y-10">
        
        <div className="border-b border-slate-200 pb-8">
          {/* COMPACT 4-STEP VISUAL INDICATOR AT THE TOP */}
          <div className="flex items-center justify-between overflow-x-auto pb-4 mb-8 text-sm font-bold gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`px-4 py-2 rounded-xl border whitespace-nowrap cursor-pointer transition-all ${
                currentStep === 1
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Step 1: Profile
            </button>
            <span className="text-slate-300 font-extrabold shrink-0 text-base">→</span>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`px-4 py-2 rounded-xl border whitespace-nowrap cursor-pointer transition-all ${
                currentStep === 2
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Step 2: Availability
            </button>
            <span className="text-slate-300 font-extrabold shrink-0 text-base">→</span>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`px-4 py-2 rounded-xl border whitespace-nowrap cursor-pointer transition-all ${
                currentStep === 3
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Step 3: Top 3 Matches
            </button>
            <span className="text-slate-300 font-extrabold shrink-0 text-base">→</span>
            <span
              className={`px-4 py-2 rounded-xl border whitespace-nowrap ${
                currentStep === 4
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              Step 4: Request & Schedule
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {currentStep === 1 && 'What are you preparing for?'}
            {currentStep === 2 && 'When are you available?'}
            {currentStep === 3 && 'Your Best Matches'}
            {currentStep === 4 && 'Request & Schedule'}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            {currentStep === 1 &&
              'Tell us about the interview you want to practice.'}
            {currentStep === 2 &&
              'Select the time slots that work for you for your mock interview.'}
            {currentStep === 3 &&
              'Below are your top suitable peer matches. Review their suitability, profile highlights, and common practice availability.'}
            {currentStep === 4 &&
              'Request approval from your selected peer, view common available time slots, and schedule your mock interview session.'}
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-xl text-base text-red-700 font-medium">
            {serverError}
          </div>
        )}

        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-10">
            <div>
              <label htmlFor="target_role" className="block text-base sm:text-lg font-bold text-slate-900 mb-1.5">
                1. Target Role <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-slate-500 mb-3">
                The exact job role you are preparing to interview for.
              </p>
              <select
                id="target_role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              )}

              {errorsStep1.targetRole && (
                <p className="mt-2 text-sm text-red-600 font-semibold">{errorsStep1.targetRole}</p>
              )}
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold text-slate-900 mb-1.5">
                2. Seniority Level <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Select your targeted experience level.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SENIORITY_OPTIONS.map((item) => {
                  const isSelected = seniorityLevel === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSeniorityLevel(item.value)}
                      className={`py-3.5 px-4 rounded-xl text-sm sm:text-base font-semibold border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {errorsStep1.seniorityLevel && (
                <p className="mt-2 text-sm text-red-600 font-semibold">{errorsStep1.seniorityLevel}</p>
              )}
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold text-slate-900 mb-1.5">
                3. Interview Type <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-slate-500 mb-3">
                The specific format or domain of interview you want to practice.
              </p>
              <div className="flex flex-wrap gap-3">
                {INTERVIEW_TYPE_OPTIONS.map((type) => {
                  const isSelected = interviewType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInterviewType(type)}
                      className={`py-2.5 px-5 rounded-full text-sm sm:text-base font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {errorsStep1.interviewType && (
                <p className="mt-2 text-sm text-red-600 font-semibold">{errorsStep1.interviewType}</p>
              )}
            </div>

            <div>
              <label className="block text-base sm:text-lg font-bold text-slate-900 mb-1.5">
                4. Domain / Key Skills <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Select up to 2 key skills that matter most for your mock interview.
              </p>

              {showSkillLimitNotice && (
                <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-900 flex items-center gap-2">
                  <span>⚠️</span> Maximum of 2 skills can be selected. Remove a skill to choose a different one.
                </div>
              )}

              {/* SELECTED SKILLS TAGS */}
              {selectedSkills.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2.5 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl items-center">
                  <span className="text-sm font-bold text-indigo-950 w-full mb-0.5">
                    Selected Skills ({selectedSkills.length}/2):
                  </span>
                  {selectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white text-indigo-900 border border-indigo-200 shadow-2xs"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-indigo-600 hover:text-indigo-950 font-extrabold focus:outline-none cursor-pointer text-base ml-1"
                        title={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* CLEAN USER-DRIVEN ADD SKILL INTERACTION */}
              {selectedSkills.length < 2 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={skillSelectChoice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          handleAddSkillFromChoice(val);
                        }
                      }}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm sm:text-base text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="">-- Select from popular skill options --</option>
                      {SUGGESTED_SKILLS.filter((s) => !selectedSkills.includes(s)).map((skill) => (
                        <option key={skill} value={skill}>
                          + {skill}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-1 gap-2">
                      <input
                        type="text"
                        placeholder="Or enter custom skill..."
                        value={customSkillInput}
                        onChange={(e) => setCustomSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkillFromChoice(customSkillInput);
                          }
                        }}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm sm:text-base text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSkillFromChoice(customSkillInput)}
                        className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                      >
                        Add Skill
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {errorsStep1.skills && (
                <p className="mt-2 text-sm text-red-600 font-semibold">{errorsStep1.skills}</p>
              )}
            </div>

            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Step 1 of 4
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Saving Profile...' : 'Continue to Choose My Mock Interview Time Slots →'}
              </button>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <div className="space-y-10">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Your Interview Requirements (From Step 1)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsScreen2Complete(false);
                    setCurrentStep(1);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800 underline font-semibold cursor-pointer"
                >
                  Edit Requirements
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-xs uppercase font-bold">Target Role</span>
                  <span className="font-bold text-slate-900 text-sm sm:text-base truncate block mt-0.5">
                    {targetRole === 'Other' ? customRole : targetRole}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-xs uppercase font-bold">Seniority</span>
                  <span className="font-bold text-slate-900 text-sm sm:text-base truncate block mt-0.5">{seniorityLevel}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-xs uppercase font-bold">Interview Format</span>
                  <span className="font-bold text-slate-900 text-sm sm:text-base truncate block mt-0.5">{interviewType}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-xs uppercase font-bold">Skills ({selectedSkills.length})</span>
                  <span className="font-bold text-slate-900 text-sm sm:text-base truncate block mt-0.5">
                    {selectedSkills.slice(0, 2).join(', ')}
                    {selectedSkills.length > 2 ? ` +${selectedSkills.length - 2}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {isScreen2Complete && completedRecord ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl shrink-0">
                    ✓
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-950">
                      Preferences Saved!
                    </h3>
                    <p className="text-base text-emerald-800 leading-relaxed">
                      Your time slot availability has been updated for matching.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFindSuitableMatches} className="space-y-10">
                <div>
                  <label className="block text-base sm:text-lg font-extrabold text-slate-900 mb-1.5">
                    Your Practice Time Availability <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm sm:text-base text-slate-600 mb-5">
                    Select the days and time windows when you are free for your mock interview session.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {TIME_SLOT_OPTIONS.map((slot) => {
                      const isSelected = selectedAvailability.includes(slot.id);
                      return (
                        <div
                          key={slot.id}
                          onClick={() => toggleAvailabilitySlot(slot.id)}
                          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div>
                            <div className="text-base sm:text-lg font-bold text-slate-900">{slot.label}</div>
                            <div className="text-sm text-slate-500 mt-1">{slot.detail}</div>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold'
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
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-sm font-bold text-slate-600 block">
                        Selected Time Slots ({selectedAvailability.length}):
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedAvailability.map((slotId) => (
                          <span
                            key={slotId}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200"
                          >
                            {slotId}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAvailabilitySlot(slotId);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 font-extrabold focus:outline-none cursor-pointer text-base"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Add custom time slot (e.g. Weekdays 9-10 PM)..."
                      value={customSlotInput}
                      onChange={(e) => setCustomSlotInput(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm sm:text-base text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSlot}
                      className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Add Slot
                    </button>
                  </div>

                  {errorsStep2.availability && (
                    <p className="mt-2 text-sm text-red-600 font-semibold">
                      {errorsStep2.availability}
                    </p>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-sm text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
                    >
                      ← Back to Requirements
                    </button>
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Step 2 of 4
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Searching Matches...
                      </>
                    ) : (
                      'Find My Matches →'
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

            {/* ALTERNATE STATE 1: NO SUITABLE MATCH */}
            {matchSystemResult && matchSystemResult.status === 'NO_MATCH' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 sm:p-10 text-center space-y-6">
                <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-3xl font-extrabold shadow-sm">
                  !
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-950">
                    No suitable match found right now.
                  </h3>
                  <p className="text-base text-amber-900 max-w-lg mx-auto leading-relaxed">
                    No active peers currently match both your target role (<span className="font-bold">{targetRole === 'Other' ? customRole : targetRole}</span>) and interview type (<span className="font-bold">{interviewType}</span>).
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
              <div className="space-y-8">
                {(matchSystemResult && matchSystemResult.matches.length > 0
                  ? matchSystemResult.matches
                  : displayedMatches
                ).slice(0, matchCountView).map((match: any) => (
                  <div
                    key={match.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:border-slate-300 transition-all space-y-6"
                  >
                    {/* CARD HEADER: Rank, Name, Role, Profile Links & Match Score */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-6">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                              match.rank === 1
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : match.rank === 2
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            Top {match.rank} Match
                          </span>
                          <span className="text-sm sm:text-base font-bold text-slate-600">
                            {match.peer_profile.seniority_level} {match.peer_profile.target_role}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                            {match.peer_profile.full_name}
                          </h3>

                          {/* LINKEDIN & RESUME PROFILE BUTTONS WITH TOOLTIPS */}
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              title="View LinkedIn profile"
                              onClick={() => setActiveLinkedInModalPeer(match.peer_profile)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                            >
                              <svg className="w-4 h-4 text-blue-700 fill-current" viewBox="0 0 24 24">
                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                              </svg>
                              LinkedIn
                            </button>

                            <button
                              type="button"
                              title="View resume"
                              onClick={() => setActiveResumeModalPeer(match.peer_profile)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                            >
                              <svg className="w-4 h-4 text-slate-700 fill-none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Resume
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* MATCH STRENGTH BADGE */}
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl shrink-0">
                        <div className="text-right">
                          <span className="text-xs uppercase font-bold text-slate-500 block">Match Strength</span>
                          <span className="text-2xl font-extrabold text-emerald-600">
                            {match.match_score}%
                          </span>
                        </div>
                        <div className="w-16 bg-slate-200 rounded-full h-3 overflow-hidden shrink-0">
                          <div
                            className="bg-emerald-500 h-3 rounded-full"
                            style={{ width: `${match.match_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* MUTUAL BENEFIT SECTION */}
                    <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
                      <span className="font-extrabold text-indigo-950 uppercase tracking-wider block text-xs sm:text-sm">
                        Mutual Benefit
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-800 font-medium">
                        <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100 flex items-center gap-2 flex-1 text-sm sm:text-base shadow-2xs">
                          <strong className="text-indigo-700 shrink-0 font-extrabold">You bring:</strong>
                          <span className="truncate font-semibold">{selectedSkills.slice(0, 2).join(' & ') || targetRole}</span>
                        </div>
                        <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100 flex items-center gap-2 flex-1 text-sm sm:text-base shadow-2xs">
                          <strong className="text-indigo-700 shrink-0 font-extrabold">Peer brings:</strong>
                          <span className="truncate font-semibold">{match.peer_profile.domain_skills?.slice(0, 2).join(' & ') || match.peer_profile.interview_type}</span>
                        </div>
                      </div>
                    </div>

                    {/* COMMON AVAILABILITY */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Common Practice Availability:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {match.common_availability && match.common_availability.length > 0 ? (
                          match.common_availability.map((slot: string) => (
                            <span
                              key={slot}
                              className="px-3.5 py-1.5 rounded-xl text-sm font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs"
                            >
                              {slot}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500 italic">No direct slot overlap</span>
                        )}
                      </div>
                    </div>

                    {/* AI REASONING (COLLAPSED BY DEFAULT) */}
                    <div className="rounded-2xl border border-indigo-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleAiExplanationCollapse(match.id)}
                        className="w-full p-4 sm:p-5 bg-indigo-50/80 hover:bg-indigo-100/80 transition-colors flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-sm sm:text-base font-extrabold text-indigo-950 uppercase tracking-wide">
                            Why this peer fits your needs
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {isAiLoading && (
                            <span className="text-xs font-bold text-indigo-600 animate-pulse">Generating...</span>
                          )}
                          {!isAiLoading && match.ai_status === 'SUCCESS' && (
                            <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ AI Verified
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-bold text-indigo-700 bg-white px-4 py-2 rounded-xl border border-indigo-200 shadow-2xs">
                            {expandedAiCardMap[match.id] ? 'Hide Breakdown ▲' : 'Show Breakdown ▼'}
                          </span>
                        </div>
                      </button>

                      {expandedAiCardMap[match.id] && (
                        <div className="bg-indigo-50/40 p-6 space-y-5 border-t border-indigo-100">
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide mb-2">
                              Why this person is suitable:
                            </h4>
                            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                              {match.ai_explanation?.why_suitable ||
                                `${match.peer_profile.full_name} matches your target role (${match.peer_profile.target_role}) and interview format (${match.peer_profile.interview_type}).`}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                            <div className="bg-white border border-emerald-100 rounded-xl p-5 space-y-2">
                              <h5 className="text-sm font-extrabold text-emerald-800 flex items-center gap-1.5">
                                <span>✓</span> Key Strengths:
                              </h5>
                              <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside font-medium">
                                {(match.ai_explanation?.key_strengths || [
                                  `Direct role alignment: ${match.peer_profile.target_role}`,
                                  `Exact format match: ${match.peer_profile.interview_type}`,
                                  `Seniority level: ${match.peer_profile.seniority_level}`,
                                ]).map((str: string, idx: number) => (
                                  <li key={idx}>{str}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-white border border-amber-100 rounded-xl p-5 space-y-2">
                              <h5 className="text-sm font-extrabold text-amber-800 flex items-center gap-1.5">
                                <span>!</span> Trade-offs & Gaps:
                              </h5>
                              <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside font-medium">
                                {(match.ai_explanation?.trade_offs_gaps || [
                                  `Peer availability slots: ${match.peer_profile.availability?.join(', ')}`,
                                ]).map((gap: string, idx: number) => (
                                  <li key={idx}>{gap}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* REQUEST CTA ACTION */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <span className="text-sm font-bold text-slate-600">
                        Format: {match.peer_profile.interview_type}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInitiatePeerRequest(match)}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md cursor-pointer"
                      >
                        Request This Peer →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                ← Back to Availability
              </button>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Step 3 of 4
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                    {selectedPeerForRequest.peer_profile?.full_name?.[0] || 'P'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                      Selected Practice Peer
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {selectedPeerForRequest.peer_profile?.full_name}
                    </h3>
                    <p className="text-sm text-slate-600 font-semibold">
                      {selectedPeerForRequest.peer_profile?.seniority_level} {selectedPeerForRequest.peer_profile?.target_role} • {selectedPeerForRequest.peer_profile?.interview_type}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-right">
                  <span className="text-xs text-slate-500 font-bold block">Match Strength</span>
                  <span className="text-xl font-extrabold text-emerald-600">
                    {selectedPeerForRequest.match_score}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-base font-semibold">
                No peer selected. Please return to Screen 3 to select a match.
              </div>
            )}

            {/* STEP 4A: REQUEST SENT (PENDING APPROVAL) */}
            {interactionStatus === 'REQUESTED' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-lg">
                    i
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-950">
                      Request sent. We'll reach out to your selected peer for approval.
                    </h3>
                    <p className="text-sm sm:text-base text-indigo-800 leading-relaxed">
                      Your interview request has been submitted to <span className="font-bold">{selectedPeerForRequest?.peer_profile?.full_name}</span>. In a live environment, the peer receives a notification to approve or decline the session.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-indigo-100 rounded-2xl p-6 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-extrabold text-slate-600 uppercase tracking-wider">
                      Request Details
                    </span>
                    <span className="px-3.5 py-1 rounded-full font-extrabold bg-amber-100 text-amber-900 border border-amber-200 text-xs sm:text-sm">
                      Status: PENDING PEER APPROVAL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-700 font-medium">
                    <div><span className="text-slate-500">Target Role:</span> <span className="font-bold text-slate-900">{targetRole === 'Other' ? customRole : targetRole}</span></div>
                    <div><span className="text-slate-500">Interview Type:</span> <span className="font-bold text-slate-900">{interviewType}</span></div>
                    <div><span className="text-slate-500">Seniority:</span> <span className="font-bold text-slate-900">{seniorityLevel}</span></div>
                  </div>
                </div>

                {/* Peer Response Simulation */}
                <div className="pt-6 border-t border-indigo-100/80 space-y-4">
                  <h4 className="text-xs sm:text-sm font-extrabold text-indigo-950 uppercase tracking-wider block">
                    Peer Response Simulation
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={handleSimulatePeerApproval}
                      disabled={isProcessingInteraction}
                      className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingInteraction ? 'Processing...' : 'Peer Accepts Your Request ✓'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulatePeerDecline}
                      disabled={isProcessingInteraction}
                      className="w-full sm:w-auto px-6 py-3.5 bg-rose-100 hover:bg-rose-200 text-rose-950 text-sm sm:text-base font-bold rounded-xl border border-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      Peer Declines Your Request ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ALTERNATE STATE 2: PEER DECLINES */}
            {interactionStatus === 'DECLINED' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 space-y-6 text-center sm:text-left shadow-sm">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-rose-200 pb-6">
                  <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-2xl font-extrabold shadow-xs shrink-0">
                    !
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-rose-950 tracking-tight">
                      Your selected peer isn't available.
                    </h2>
                    <p className="text-base text-rose-900 leading-relaxed">
                      Unfortunately, <span className="font-bold">{selectedPeerForRequest?.peer_profile?.full_name}</span> is currently unable to accept practice mock interview requests.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-rose-100 rounded-2xl p-6 space-y-3 shadow-2xs">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">
                    Next Recommended Step
                  </h3>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                    Your previous search results are preserved. You can select another top-ranked match from your suitable peer list.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setInteractionStatus('REQUESTED');
                      setSelectedPeerForRequest(null);
                      setCurrentStep(3);
                    }}
                    className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Choose Another Peer →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4B: PEER APPROVED - SELECT TIME SLOT */}
            {interactionStatus === 'APPROVED' && (
              <div className="space-y-8">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-emerald-950">
                      Peer Approval Confirmed!
                    </h3>
                    <p className="text-sm sm:text-base text-emerald-800 leading-relaxed">
                      {selectedPeerForRequest?.peer_profile?.full_name} has accepted your request. Please select a common available practice time slot.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <h4 className="text-sm font-extrabold text-slate-600 uppercase tracking-wider">
                    Select Common Practice Time Slot
                  </h4>

                  {selectedPeerForRequest?.common_availability && selectedPeerForRequest.common_availability.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPeerForRequest.common_availability.map((slot: string) => (
                        <label
                          key={slot}
                          className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                            selectedScheduledSlot === slot
                              ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
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
                              className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <span className="text-base sm:text-lg font-bold text-slate-900">{slot}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Mutual Overlap
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-500 italic mb-2">
                        No direct mutual slot overlap found in profile default. Choose from available peer practice slots:
                      </p>
                      {(selectedPeerForRequest?.peer_profile?.availability || selectedAvailability).map((slot: string) => (
                        <label
                          key={slot}
                          className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                            selectedScheduledSlot === slot
                              ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
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
                              className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <span className="text-base sm:text-lg font-bold text-slate-900">{slot}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
                            Peer Slot
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={handleScheduleMockInterview}
                      disabled={!selectedScheduledSlot || isProcessingInteraction}
                      className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingInteraction ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
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

            {/* STEP 4C: FINAL STATE - MOCK INTERVIEW SCHEDULED */}
            {interactionStatus === 'SCHEDULED' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 space-y-6 shadow-sm text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-emerald-200 pb-6">
                  <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
                    ✓
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 tracking-tight">
                      Mock interview scheduled
                    </h2>
                    <p className="text-base text-emerald-900 leading-relaxed">
                      You are all set! Your practice mock interview session has been confirmed with your peer.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-emerald-100 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xs">
                  <h3 className="text-sm font-extrabold text-slate-600 uppercase tracking-wider">
                    Confirmed Session Summary
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm sm:text-base">
                    <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-slate-500 block text-xs uppercase font-bold">Matched Peer:</span>
                      <span className="font-extrabold text-slate-900 text-base sm:text-lg block">
                        {selectedPeerForRequest?.peer_profile?.full_name}
                      </span>
                      <span className="text-slate-600 block text-sm font-semibold">
                        {selectedPeerForRequest?.peer_profile?.seniority_level} {selectedPeerForRequest?.peer_profile?.target_role}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-slate-500 block text-xs uppercase font-bold">Scheduled Slot:</span>
                      <span className="font-extrabold text-indigo-700 text-base sm:text-lg block">
                        {selectedScheduledSlot}
                      </span>
                      <span className="text-slate-600 block text-sm font-semibold">
                        Format: {interviewType}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl sm:col-span-2 space-y-1">
                      <span className="text-slate-500 block text-xs uppercase font-bold">Candidate Role:</span>
                      <span className="font-bold text-slate-900 text-base">
                        {targetRole === 'Other' ? customRole : targetRole} ({seniorityLevel})
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
                    className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-base font-bold transition-colors cursor-pointer"
                  >
                    ← Practice Another Interview
                  </button>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-sm text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
              >
                ← Back to Top 3 Matches
              </button>

              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Step 4 of 4
              </span>
            </div>
          </div>
        )}
      </div>

      {/* LINKEDIN PROTOTYPE MODAL */}
      {activeLinkedInModalPeer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-base shadow-xs">
                  in
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                    {activeLinkedInModalPeer.full_name}
                  </h3>
                  <span className="text-sm text-blue-600 font-semibold">LinkedIn Member Profile</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLinkedInModalPeer(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-sm sm:text-base text-slate-700">
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                <span className="font-bold text-blue-950 block text-base sm:text-lg">
                  {activeLinkedInModalPeer.seniority_level} {activeLinkedInModalPeer.target_role}
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Experienced practitioner preparing for {activeLinkedInModalPeer.interview_type} mock interviews.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs sm:text-sm block">
                  Core Skills & Domain Expertise
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeLinkedInModalPeer.domain_skills?.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg font-semibold text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600 italic">
                ℹ️ Prototype Content Notice: This is a sample LinkedIn profile representation for prototype demonstration purposes. No external network request was performed.
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveLinkedInModalPeer(null)}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESUME PROTOTYPE MODAL */}
      {activeResumeModalPeer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-800 text-white font-extrabold flex items-center justify-center text-lg shadow-xs">
                  📄
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                    {activeResumeModalPeer.full_name} — Resume
                  </h3>
                  <span className="text-sm text-slate-500 font-semibold">Verified Candidate Profile</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveResumeModalPeer(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-sm sm:text-base text-slate-700">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-950 block text-base sm:text-lg">
                  {activeResumeModalPeer.seniority_level} {activeResumeModalPeer.target_role}
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Specializing in {activeResumeModalPeer.interview_type} cases and peer interview prep.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600 italic">
                ℹ️ Prototype Content Notice: This is a sample resume summary representation for prototype demonstration purposes. No file download was executed.
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveResumeModalPeer(null)}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 cursor-pointer"
              >
                Close Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
