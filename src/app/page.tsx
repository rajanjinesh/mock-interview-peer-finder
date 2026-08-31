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

export default function ProfileIntakeScreen() {
  const [targetRole, setTargetRole] = useState<string>('Product Manager');
  const [customRole, setCustomRole] = useState<string>('');
  const [seniorityLevel, setSeniorityLevel] = useState<string>('Senior');
  const [interviewType, setInterviewType] = useState<string>('Product Design');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Fintech', 'Metrics']);
  const [customSkillInput, setCustomSkillInput] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const effectiveRole = targetRole === 'Other' ? customRole.trim() : targetRole;
    if (!effectiveRole) {
      newErrors.targetRole = 'Please specify your target role.';
    }

    if (!seniorityLevel) {
      newErrors.seniorityLevel = 'Please select a seniority level.';
    }

    if (!interviewType) {
      newErrors.interviewType = 'Please select an interview type.';
    }

    if (selectedSkills.length === 0) {
      newErrors.skills = 'Please select or add at least one domain skill.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const finalRole = targetRole === 'Other' ? customRole.trim() : targetRole;

    try {
      const { data, error } = await supabase
        .from('candidate_requirements')
        .insert({
          target_role: finalRole,
          seniority_level: seniorityLevel,
          interview_type: interviewType,
          domain_skills: selectedSkills,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setSubmittedData(data);
    } catch (err: any) {
      console.error('Error saving candidate requirements:', err);
      setServerError(err.message || 'Failed to save candidate requirements. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl p-6 sm:p-10">
        <div className="border-b border-slate-200 pb-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Screen 1 of 4: Profile Intake
            </span>
            <span className="text-xs text-slate-400 font-mono">Mock Interview Peer Finder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Interview Requirements Intake
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Provide the details of the mock interview you are preparing for. The system will use
            these structured criteria to find and rank your ideal peer matches in the next step.
          </p>
        </div>

        {submittedData ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-emerald-900">
                  Requirements Saved Successfully!
                </h3>
                <p className="mt-1 text-sm text-emerald-700">
                  Your interview requirements have been stored in the system database with Request ID:{' '}
                  <span className="font-mono font-semibold">{submittedData.id}</span>
                </p>

                <div className="mt-4 bg-white/80 border border-emerald-100 rounded-lg p-4 text-xs text-slate-700 space-y-1">
                  <div><span className="font-medium text-slate-900">Target Role:</span> {submittedData.target_role}</div>
                  <div><span className="font-medium text-slate-900">Seniority Level:</span> {submittedData.seniority_level}</div>
                  <div><span className="font-medium text-slate-900">Interview Type:</span> {submittedData.interview_type}</div>
                  <div><span className="font-medium text-slate-900">Domain Skills:</span> {Array.isArray(submittedData.domain_skills) ? submittedData.domain_skills.join(', ') : ''}</div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-md">
                    Screen 1 Complete. Ready for Matching System.
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubmittedData(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                  >
                    Edit Requirements
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
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

            {errors.targetRole && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.targetRole}</p>
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
            {errors.seniorityLevel && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.seniorityLevel}</p>
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
            {errors.interviewType && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.interviewType}</p>
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
                <span className="text-xs font-semibold text-slate-500 w-full mb-1">Selected Skills ({selectedSkills.length}):</span>
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

            {errors.skills && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.skills}</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              * Required fields
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Saving Requirements...' : 'Save Interview Requirements'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
