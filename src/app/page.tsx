'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

export default function MockInterviewPeerFinderApp() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

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
    } catch (err: any) {
      console.error('Error saving availability:', err);
      setServerError(err.message || 'Failed to save availability choices. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl p-6 sm:p-10">
        
        <div className="border-b border-slate-200 pb-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  currentStep === 1
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                Step 1: Profile Intake
              </span>
              <span className="text-slate-300">→</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  currentStep === 2
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
              >
                Step 2: Availability
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Mock Interview Peer Finder
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {currentStep === 1 ? 'Interview Requirements Intake' : 'Set Your Practice Availability'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            {currentStep === 1
              ? 'Provide details of the interview you are preparing for. These criteria will be used to determine suitable peer matches.'
              : 'Select the days and time slots when you are available for mock interview practice sessions.'}
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
      </div>
    </main>
  );
}
