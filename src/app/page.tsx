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

  const toggleSkill = (skill: string) => {
    setShowSkillLimitNotice(false);
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      }
      if (prev.length >= 2) {
        setShowSkillLimitNotice(true);
        return prev;
      }
      return [...prev, skill];
    });
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSkillLimitNotice(false);
    const trimmed = customSkillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      if (selectedSkills.length >= 2) {
        setShowSkillLimitNotice(true);
        return;
      }
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
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-sm border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-8">
        
        <div className="border-b border-slate-200 pb-6">
          {/* COMPACT 4-STEP VISUAL INDICATOR AT THE TOP (CHANGE 6) */}
          <div className="flex items-center justify-between overflow-x-auto pb-4 mb-6 text-xs font-semibold gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                currentStep === 1
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Step 1: Profile
            </button>
            <span className="text-slate-300 font-bold shrink-0">→</span>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                currentStep === 2
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Step 2: Availability
            </button>
            <span className="text-slate-300 font-bold shrink-0">→</span>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                currentStep === 3
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Step 3: Top 3 Matches
            </button>
            <span className="text-slate-300 font-bold shrink-0">→</span>
            <span
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap ${
                currentStep === 4
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              Step 4: Request & Schedule
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {currentStep === 1 && 'What are you preparing for?'}
            {currentStep === 2 && 'When are you available?'}
            {currentStep === 3 && 'Your Best Matches'}
            {currentStep === 4 && 'Request & Schedule'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
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
                {SENIORITY_OPTIONS.map((item) => {
                  const isSelected = seniorityLevel === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSeniorityLevel(item.value)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
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
                Select up to 2 key skills that matter most for your mock interview practice.
              </p>

              {showSkillLimitNotice && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900 flex items-center gap-2">
                  <span>⚠️</span> Maximum of 2 skills can be selected. Remove a skill to choose a different one.
                </div>
              )}

              {selectedSkills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500 w-full mb-1">
                    Selected Skills ({selectedSkills.length}/2):
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

            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Step 1 of 4
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Saving Profile...' : 'Continue to Choose My Mock Interview Time Slots →'}
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

                <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                    >
                      ← Back to Requirements
                    </button>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Step 2 of 4
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                            Top {match.rank}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {match.peer_profile.seniority_level} {match.peer_profile.target_role}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-bold text-slate-900">
                            {match.peer_profile.full_name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              title="View LinkedIn profile"
                              onClick={() => setActiveLinkedInModalPeer(match.peer_profile)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-blue-700 fill-current" viewBox="0 0 24 24">
                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                              </svg>
                              LinkedIn
                            </button>
                            <button
                              type="button"
                              title="View resume"
                              onClick={() => setActiveResumeModalPeer(match.peer_profile)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-600 fill-none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Resume
                            </button>
                          </div>
                        </div>
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

                    <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-2">
                      <span className="font-extrabold text-indigo-950 uppercase tracking-wider block text-[11px]">
                        Mutual Benefit
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-700 font-medium">
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5 flex-1">
                          <strong className="text-indigo-700 shrink-0">You bring:</strong>
                          <span className="truncate">{selectedSkills.slice(0, 2).join(' & ') || targetRole}</span>
                        </div>
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5 flex-1">
                          <strong className="text-indigo-700 shrink-0">Peer brings:</strong>
                          <span className="truncate">{match.peer_profile.domain_skills?.slice(0, 2).join(' & ') || match.peer_profile.interview_type}</span>
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

                    <div className="rounded-xl border border-indigo-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleAiExplanationCollapse(match.id)}
                        className="w-full p-4 bg-indigo-50 hover:bg-indigo-100/80 transition-colors flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                            Why this peer fits your needs
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAiLoading && (
                            <span className="text-[11px] font-semibold text-indigo-600 animate-pulse">Generating...</span>
                          )}
                          {!isAiLoading && match.ai_status === 'SUCCESS' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ AI Verified
                            </span>
                          )}
                          <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-md border border-indigo-200 shadow-2xs">
                            {expandedAiCardMap[match.id] ? 'Hide Breakdown ▲' : 'Show Breakdown ▼'}
                          </span>
                        </div>
                      </button>

                      {expandedAiCardMap[match.id] && (
                        <div className="bg-indigo-50/50 p-5 space-y-4 border-t border-indigo-100">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                              Why this person is suitable:
                            </h4>
                            <p className="text-xs text-slate-700 leading-relaxed font-normal">
                              {match.ai_explanation?.why_suitable ||
                                `${match.peer_profile.full_name} matches your target role (${match.peer_profile.target_role}) and interview format (${match.peer_profile.interview_type}).`}
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
                      )}
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                    <div><span className="text-slate-400">Target Role:</span> <span className="font-semibold">{targetRole === 'Other' ? customRole : targetRole}</span></div>
                    <div><span className="text-slate-400">Interview Type:</span> <span className="font-semibold">{interviewType}</span></div>
                    <div><span className="text-slate-400">Seniority:</span> <span className="font-semibold">{seniorityLevel}</span></div>
                  </div>
                </div>

                {/* CHANGE 12: Peer Response Simulation */}
                <div className="pt-4 border-t border-indigo-100 space-y-3">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                    Peer Response Simulation
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSimulatePeerApproval}
                      disabled={isProcessingInteraction}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingInteraction ? 'Processing...' : 'Peer Accepts Your Request ✓'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulatePeerDecline}
                      disabled={isProcessingInteraction}
                      className="w-full sm:w-auto px-5 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold rounded-xl border border-rose-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      Peer Declines Your Request ✕
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

                    <div className="p-3 bg-slate-50 rounded-lg sm:col-span-2">
                      <span className="text-slate-400 block mb-0.5">Candidate Role:</span>
                      <span className="font-semibold text-slate-800">
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

            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                ← Back to Top 3 Matches
              </button>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Step 4 of 4
              </span>
            </div>
          </div>
        )}
      </div>

      {/* LINKEDIN PROTOTYPE MODAL (CHANGE 1) */}
      {activeLinkedInModalPeer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                  in
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {activeLinkedInModalPeer.full_name}
                  </h3>
                  <span className="text-xs text-blue-600 font-medium">LinkedIn Member Profile</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLinkedInModalPeer(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                <span className="font-bold text-blue-900 block text-sm">
                  {activeLinkedInModalPeer.seniority_level} {activeLinkedInModalPeer.target_role}
                </span>
                <p className="text-slate-600">
                  Experienced practitioner preparing for {activeLinkedInModalPeer.interview_type} mock interviews.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Core Skills & Domain Expertise
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeLinkedInModalPeer.domain_skills?.map((skill: string) => (
                    <span key={skill} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-500 italic text-[11px]">
                ℹ️ Prototype Content Notice: This is a sample LinkedIn profile representation for prototype demonstration purposes. No external network request was performed.
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveLinkedInModalPeer(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESUME PROTOTYPE MODAL (CHANGE 1) */}
      {activeResumeModalPeer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-slate-800 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                  📄
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {activeResumeModalPeer.full_name} — Candidate Resume Summary
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Verified Peer Profile</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveResumeModalPeer(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {activeResumeModalPeer.seniority_level} {activeResumeModalPeer.target_role}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                    Interview Ready
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Proven background in product development, technical architecture, and cross-functional leadership. Preparing for high-stakes {activeResumeModalPeer.interview_type} interviews.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Highlighted Domain Focus
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Primary Domain</span>
                    <span className="font-semibold text-slate-800">{activeResumeModalPeer.domain_skills?.[0] || 'Product Strategy'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Interview Format</span>
                    <span className="font-semibold text-slate-800">{activeResumeModalPeer.interview_type}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900 text-[11px] italic">
                ℹ️ Prototype Content Notice: This is a sample resume representation for prototype demonstration purposes.
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveResumeModalPeer(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 cursor-pointer"
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
