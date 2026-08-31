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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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

  const handleRequestPeer = (peerId: string) => {
    setRequestedPeerId(peerId);
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
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  currentStep === 3
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
              >
                Step 3: Top 3 Matches
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
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            {currentStep === 1 &&
              'Provide details of the interview you are preparing for. These criteria will be used to determine suitable peer matches.'}
            {currentStep === 2 &&
              'Select the days and time slots when you are available for mock interview practice sessions.'}
            {currentStep === 3 &&
              'Below are the top suitable peers for your interview requirements. Review their match strength, common availability, and suitability explanations.'}
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

            {/* NO MATCH STATE CARD */}
            {matchSystemResult && matchSystemResult.status === 'NO_MATCH' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  !
                </div>
                <div>
                  <h3 className="text-xl font-bold text-amber-900">
                    No Direct Peer Matches Found
                  </h3>
                  <p className="mt-2 text-sm text-amber-800 max-w-lg mx-auto leading-relaxed">
                    No active peers currently match both your target role (<span className="font-semibold">{targetRole === 'Other' ? customRole : targetRole}</span>) and interview type (<span className="font-semibold">{interviewType}</span>).
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Adjust Target Role / Interview Format
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Adjust Availability
                  </button>
                </div>
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
                        onClick={() => handleRequestPeer(match.id)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-xs cursor-pointer ${
                          requestedPeerId === match.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {requestedPeerId === match.id ? '✓ Requested' : 'Request This Peer'}
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
      </div>
    </main>
  );
}
