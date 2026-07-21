import React, { useState, useRef, useEffect, useCallback } from "react";
import { useServerFn } from '@tanstack/react-start';
import savePartB from '@/lib/partb.functions';

const FONT_IMPORT_ID = "dart-app-fonts";

function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_IMPORT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_IMPORT_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@600;700;800&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ---------------------------------------------------------------------------
   Shared option sets
--------------------------------------------------------------------------- */
const YES_NO = ["Yes", "No"];

const CONDITION_OPTIONS = [
  "Diabetes", "End Stage Renal Disease", "Undergoing Cancer Treatment", "Arthritis",
  "Amputation", "Neurological Condition/Cognitive", "Neuromuscular Condition",
  "Pulmonary Disease", "Cardiac Disease", "Mental Illness", "Traumatic Brain Injury",
  "Legally Blind", "Severely Visually Impaired", "Alzheimer's", "Dementia", "Autism",
  "Hearing Impairment", "Seizures", "Other",
];

const NEURO_SEVERITY = ["Mild", "Moderate", "Severe", "Profound"];
const MOBILITY_RANGE = ["No independent functional mobility", "Blocks", "Less than \u00bd mile", "Greater than \u00bd mile"];
const DIRECTIONS_STEPS = ["1 Step Directions", "2 Step Directions", "3 Step Directions", "None"];
const COGNITIVE_DOMAINS = ["Problem Solving", "Short-term Memory", "Attention", "Processing", "Foresight/Planning", "Safety Awareness/Judgment"];
const WALK_RANGE = ["Only on his/her own property and to familiar places", "To places nearby (for example, on the same block)", "To places further away"];
const CROSSING_ABILITY = ["At quiet streets with very little traffic", "At traffic lights", "At busy intersections", "With auditory cross signals only", "Other"];
const LIGHTING_CONDITIONS = ["Bright sunlight", "Dimly lit or shaded places", "Nighttime", "Other"];

const SECTIONS = [
  { id: "professional-info", label: "Professional Information", icon: "user" },
  { id: "medical-physical", label: "Medical / Physical", icon: "heart" },
  { id: "cognitive", label: "Cognitive Disability", icon: "clipboard" },
  { id: "behavioral", label: "Behavioral Health", icon: "shield" },
  { id: "vision", label: "Vision Disability", icon: "clipboard" },
  { id: "printed-upload", label: "Upload Printed Copy", icon: "upload" },
];

const initialFormState = {
  provName: "", provSignature: "", provTitle: "", provSpecialization: "",
  provLicense: "", provClinic: "", provAddress: "", provPhone: "",

  patientSince: "", lastEvalDate: "",
  conditions: [], conditionOther: "",
  dialysis: "", cancerDuration: "", arthritisDetail: "", amputationDetail: "",
  neuroSeverity: "", hearingDegree: "",
  mp_temporary: "", mp_duration: "",
  mp_envConditions: "", mp_envWhat: "", mp_envImpact: "",
  mp_canBeTrained: "", mp_trainedWhyNot: "",
  mp_mobilityRange: "", mp_mobilityBlocks: "",
  mp_waitWithShelter: "", mp_waitWithoutShelter: "",
  seizureTypes: "", seizureFrequency: "", seizureRecoveryTime: "", seizureAura: "",
  seizureTriggers: "", seizureMedicated: "", seizureControlled: "", seizureFunctionsSafely: "", seizureLastDate: "",

  cog_diagnosis: "", cog_behaviorProblems: "", cog_behaviorDescribe: "",
  cog_travelAlone: "", cog_followDirections: "", cog_knowIfLost: "",
  cog_recognizeDangers: "", cog_recognizeDangersExplain: "", cog_crossStreets: "",
  cog_domains: [], cog_domainsExplain: "", cog_enrolledPrograms: "", cog_enrolledList: "",

  bh_diagnosis: "", bh_prognosis: "", bh_medicated: "", bh_medicationSafe: "",
  bh_declineFromMedChange: "", bh_declineDescribe: "", bh_hallucinations: "", bh_hallucinationsImpact: "",
  bh_anxiety: "", bh_anxietyExplain: "", bh_lifeSkillsLacking: "", bh_lifeSkillsExplain: "",

  vis_diagnosis: "", vis_bestCorrected: "", vis_prognosis: "",
  vis_walkAlone: "", vis_walkWhere: [], vis_crossAbility: [],
  vis_seeSteps: "", vis_lighting: [], vis_otherConditions: "", vis_otherExplain: "",
  vis_additionalInfo: "",
};

const REQUIRED_FIELDS = ["provName", "provLicense", "provPhone"];

/* =============================================================================
   Icon set
============================================================================= */
const Icon = ({ name, className = "" }) => {
  const common = { className: `dart-icon ${className}`, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "user":
      return (<svg {...common}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
    case "clipboard":
      return (<svg {...common}><rect x="5.5" y="4.5" width="13" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><rect x="9" y="3" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.8"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
    case "shield":
      return (<svg {...common}><path d="M12 3.5l7 2.6v5.4c0 4.6-3 8.2-7 9.4-4-1.2-7-4.8-7-9.4V6.1l7-2.6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    case "upload":
      return (<svg {...common}><path d="M12 15.5V4M12 4L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.5 15.5v3a2 2 0 002 2h11a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
    case "check":
      return (<svg viewBox="0 0 14 11" className={className} fill="none"><path d="M1 5.5L5 9.5L13 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    case "file":
      return (<svg {...common}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>);
    case "heart":
      return (<svg {...common}><path d="M12 20s-7.2-4.5-9.4-9C1.2 7.6 3 4.5 6.3 4.5c2 0 3.4 1.1 4.2 2.4.7 1.1.7 1.1 1.5 0 .8-1.3 2.2-2.4 4.2-2.4 3.3 0 5.1 3.1 3.7 6.5-2.2 4.5-9.4 9-9.4 9z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>);
    case "printer":
      return (<svg {...common}><path d="M7 8.5V4.5h10v4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><rect x="4.5" y="8.5" width="15" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="7" y="13" width="10" height="6.5" stroke="currentColor" strokeWidth="1.7"/></svg>);
    case "mail":
      return (<svg {...common}><rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M4.5 6.5l7.5 6.5 7.5-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    case "pin":
      return (<svg {...common}><path d="M12 21s6.5-6.1 6.5-11A6.5 6.5 0 105.5 10c0 4.9 6.5 11 6.5 11z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.7"/></svg>);
    case "route":
      return (<svg {...common}><path d="M4.5 12h13M13.5 6.5L19 12l-5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
    case "stethoscope":
      return (<svg {...common}><path d="M6 4v6a4 4 0 008 0V4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M10 14v2a5 5 0 005 5 5 5 0 005-5v-1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="20" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="4" r="1.3" stroke="currentColor" strokeWidth="1.4"/><circle cx="14" cy="4" r="1.3" stroke="currentColor" strokeWidth="1.4"/></svg>);
    case "eye":
      return (<svg {...common}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/></svg>);
    default:
      return null;
  }
};

/* =============================================================================
   Small presentational primitives (shared pattern with Part A)
============================================================================= */
function SectionEyebrow({ children }) { return <p className="dart-eyebrow">{children}</p>; }

function Field({ label, hint, htmlFor, required, error, children, wide }) {
  return (
    <div className={`dart-field${wide ? " dart-field--wide" : ""}`}>
      {label && (
        <label htmlFor={htmlFor} className="dart-label">
          {label}{required && <span className="dart-required">*</span>}
          {hint && <span className="dart-hint">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="dart-error-text">{error}</p>}
    </div>
  );
}

function TextInput({ error, className = "", ...props }) {
  return <input className={`dart-input${error ? " dart-input--error" : ""} ${className}`} {...props} />;
}
function TextArea({ error, className = "", rows = 3, ...props }) {
  return <textarea rows={rows} className={`dart-input dart-textarea${error ? " dart-input--error" : ""} ${className}`} {...props} />;
}

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div className="dart-pillgroup" role="radiogroup">
      {options.map((opt) => {
        const label = typeof opt === "string" ? opt : opt.label;
        const val = typeof opt === "string" ? opt : opt.value;
        const checked = value === val;
        return (
          <label key={val} className={`dart-pill${checked ? " dart-pill--active" : ""}`}>
            <input type="radio" name={name} value={val} checked={checked} onChange={onChange} className="dart-sr-only" />
            {label}
          </label>
        );
      })}
    </div>
  );
}

function CheckboxGroup({ name, options, values, onToggle, columns = 1 }) {
  return (
    <div className={`dart-chipgrid dart-chipgrid--cols${columns}`}>
      {options.map((opt) => {
        const label = typeof opt === "string" ? opt : opt.label;
        const val = typeof opt === "string" ? opt : opt.value;
        const checked = values.includes(val);
        return (
          <label key={val} className={`dart-chip${checked ? " dart-chip--active" : ""}`}>
            <span className={`dart-checkbox${checked ? " dart-checkbox--active" : ""}`}>
              {checked && <Icon name="check" className="dart-checkbox-icon" />}
            </span>
            <input type="checkbox" name={name} value={val} checked={checked} onChange={() => onToggle(name, val)} className="dart-sr-only" />
            {label}
          </label>
        );
      })}
    </div>
  );
}

function Question({ number, label, children }) {
  return (
    <div className="dart-question">
      <div className="dart-question-head">
        {number && <span className="dart-question-num">{number}</span>}
        <p className="dart-question-label">{label}</p>
      </div>
      {children && <div className={number ? "dart-question-body" : "dart-question-body dart-question-body--flush"}>{children}</div>}
    </div>
  );
}

function FormCard({ id, children, tone }) {
  return <section id={id} className={`dart-card${tone ? ` dart-card--${tone}` : ""}`}>{children}</section>;
}

function CardTitle({ eyebrow, title, description, icon }) {
  return (
    <div className="dart-card-title-wrap">
      <div className="dart-card-title-row">
        {icon && <span className="dart-card-icon"><Icon name={icon} /></span>}
        <div>
          {eyebrow && <SectionEyebrow>{eyebrow}</SectionEyebrow>}
          <h2 className="dart-card-title">{title}</h2>
        </div>
      </div>
      {description && <p className="dart-card-desc">{description}</p>}
    </div>
  );
}

function RouteRail({ sections, activeId, completed }) {
  return (
    <nav aria-label="Application sections" className="dart-rail">
      <div className="dart-rail-sticky">
        <p className="dart-rail-heading"><Icon name="route" className="dart-rail-heading-icon" />Route Progress</p>
        <ol className="dart-rail-line">
          {sections.map((s) => {
            const isActive = s.id === activeId;
            const isDone = completed.has(s.id);
            return (
              <li key={s.id} className="dart-rail-station">
                <span className={`dart-rail-dot${isDone ? " dart-rail-dot--done" : ""}${isActive ? " dart-rail-dot--active" : ""}`}>
                  {isDone && <Icon name="check" className="dart-rail-dot-check" />}
                </span>
                <a href={`#${s.id}`} className={`dart-rail-label${isActive ? " dart-rail-label--active" : ""}${isDone ? " dart-rail-label--done" : ""}`}>
                  {s.label}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function RouteRailMobile({ sections, activeId }) {
  return (
    <nav aria-label="Application sections" className="dart-rail-mobile">
      {sections.map((s) => (
        <a key={s.id} href={`#${s.id}`} className={`dart-rail-pill${s.id === activeId ? " dart-rail-pill--active" : ""}`}>{s.label}</a>
      ))}
    </nav>
  );
}

function UploadWorkflow({ onBack }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const ACCEPTED = [".pdf", ".jpg", ".jpeg", ".png"];
  const MAX_SIZE_MB = 20;

  const validateAndSetFile = (candidate) => {
    if (!candidate) return;
    const ext = "." + candidate.name.split(".").pop().toLowerCase();
    if (!ACCEPTED.includes(ext) || candidate.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadState("error"); setFile(null); return;
    }
    setUploadState("idle"); setFile(candidate);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  async function handleFileUpload() {
    if (!file) return;
    setUploadState("uploading"); setProgress(0);
    const fakeTimer = setInterval(() => {
      setProgress((p) => (p >= 90 ? (clearInterval(fakeTimer), p) : p + 10));
    }, 120);
    try {
      await new Promise((res) => setTimeout(res, 1200));
      clearInterval(fakeTimer); setProgress(100); setUploadState("done");
    } catch {
      clearInterval(fakeTimer); setUploadState("error");
    }
  }

  return (
    <FormCard id="printed-upload" tone="upload">
      <CardTitle title="Already have a printed Part B?" description="Upload a scanned copy of the signed, completed Part B below." icon="upload" />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        aria-label="Upload scanned application. Drag and drop a file, or press Enter to browse."
        className={`dart-dropzone${dragActive ? " dart-dropzone--active" : ""}`}
      >
        <div className="dart-dropzone-icon"><Icon name="upload" /></div>
        <p className="dart-dropzone-text">Drag &amp; drop your file here, or <span className="dart-link">click to browse</span></p>
        <p className="dart-dropzone-sub">Supported files: PDF, JPG, JPEG, PNG &middot; Maximum size {MAX_SIZE_MB}MB</p>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="dart-sr-only" onChange={(e) => validateAndSetFile(e.target.files?.[0])} />
      </div>

      {uploadState === "error" && (
        <p className="dart-error-text dart-error-text--block">That file couldn&rsquo;t be added — please choose a PDF, JPG, JPEG, or PNG under {MAX_SIZE_MB}MB.</p>
      )}

      {file && (
        <div className="dart-filepreview">
          <div className="dart-filepreview-left">
            <span className="dart-filepreview-icon"><Icon name="file" /></span>
            <div>
              <p className="dart-filepreview-name">{file.name}</p>
              <p className="dart-filepreview-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          {uploadState === "uploading" && (<div className="dart-progress-track"><div className="dart-progress-fill" style={{ width: `${progress}%` }} /></div>)}
          {uploadState === "done" && <span className="dart-upload-done"><Icon name="check" className="dart-upload-done-icon" />Uploaded</span>}
        </div>
      )}

      <div className="dart-actions">
        <button type="button" onClick={() => inputRef.current?.click()} className="dart-btn dart-btn--ghost">Choose File</button>
        <button type="button" onClick={handleFileUpload} disabled={!file || uploadState === "uploading"} className="dart-btn dart-btn--success">
          {uploadState === "uploading" ? "Uploading…" : "Upload & Submit"}
        </button>
      </div>

      {onBack && (
        <p className="dart-footnote">
          Don&rsquo;t have a printed copy?{" "}
          <button type="button" onClick={onBack} className="dart-link dart-link--button">Fill out the form online instead</button>
        </p>
      )}
    </FormCard>
  );
}

export default function PartB() {
  useGoogleFonts();

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [entryMode, setEntryMode] = useState("form");

  const saveFn = useServerFn(savePartB);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCheckboxToggle = useCallback((name, val) => {
    setFormData((prev) => {
      const current = prev[name] || [];
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
      return { ...prev, [name]: next };
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); }),
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const completedSections = new Set(
    SECTIONS.filter((s) => {
      if (s.id === "professional-info") return REQUIRED_FIELDS.every((f) => formData[f]?.trim());
      return false;
    }).map((s) => s.id)
  );

  function validate() {
    const nextErrors = {};
    REQUIRED_FIELDS.forEach((field) => { if (!formData[field]?.trim()) nextErrors[field] = "This field is required."; });
    if (!formData.provSignature.trim()) nextErrors.provSignature = "A signature is required to submit.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      setSubmitStatus("error");
      document.getElementById("professional-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSubmitStatus("submitting");
    try {
      const res = await saveFn({ data: formData });
      if (!res.ok) {
        setSubmitStatus("error");
      } else {
        setSubmitStatus("success");
      }
    } catch (err) {
      setSubmitStatus("error");
    }
  }

  return (
    <div className="dartB-root">
      <style>{DART_STYLES}</style>

      <header className="dart-header">
        <div className="dart-header-inner">
          <div className="dart-header-row">
            <div className="dart-brand">
              <div className="dart-logo-badge"><Icon name="route" className="dart-logo-icon" /></div>
              <div>
                <p className="dart-brand-eyebrow">DART &middot; Moving Forward</p>
                <h1 className="dart-brand-title">ADA Paratransit Services Application</h1>
              </div>
            </div>
            <span className="dart-part-badge dart-part-badge--green">Part B</span>
          </div>
          <RouteRailMobile sections={SECTIONS} activeId={activeSection} />
        </div>
      </header>

      <main className="dart-main">
        <div className="dart-layout">
          <RouteRail sections={SECTIONS} activeId={activeSection} completed={completedSections} />

          <div className="dart-content">
            <div className="dart-intro-card dart-intro-card--green">
              <p className="dart-intro-lead"><strong>Dear Health Care Professional:</strong></p>
              <p className="dart-intro-body">
                In order to complete this application on behalf of the applicant, you must be either a certified or
                licensed professional. If you feel you are qualified to complete this application as a health care
                professional but do not have a certification or license number, please contact DART at{" "}
                <strong>1-800-652-3278, Option 4</strong> and request to speak to the Eligibility Supervisor for approval.
              </p>
              <p className="dart-intro-body">
                The applicant is asking you to complete and sign Part B, certifying that they have a disability that
                prevents them from using fixed route bus service. Under the ADA, if a person has the functional and
                cognitive ability to use DART Fixed Route buses, that person is not eligible for paratransit services.
                Disability alone, distance to a bus stop, or availability of fixed route service is not, by itself, a
                qualifier for paratransit services.
              </p>
              <p className="dart-intro-body dart-intro-body--strong">
                Please note: if you do not have Part A, you will need to return Part B to the applicant. DART must
                receive both Part A and Part B as one submission.
              </p>

              <div className="dart-eligible-box">
                <p className="dart-eligible-title">Who can complete Part B <span className="dart-underline">(must be licensed/certified)</span></p>
                <div className="dart-eligible-grid">
                  <ul>
                    <li>Vocational Rehabilitation Counselor</li>
                    <li>Social Worker</li>
                    <li>Respiratory Therapist</li>
                    <li>Psychologist</li>
                    <li>Psychiatrist</li>
                    <li>Audiologist</li>
                    <li>Independent Living Specialist</li>
                  </ul>
                  <ul>
                    <li>O &amp; M Instructor</li>
                    <li>Physician</li>
                    <li>Physician Assistant</li>
                    <li>Nurse Practitioner</li>
                    <li>Physical Therapist</li>
                    <li>Optometrist / Ophthalmologist</li>
                    <li>Registered Nurse</li>
                  </ul>
                </div>
              </div>
            </div>

            <FormCard id="entry-choice" tone="upload">
              <CardTitle title="How would you like to complete Part B?" description="Choose the option that fits — you can switch between them at any time." icon="route" />
              <div className="dart-radiocards">
                <label className={`dart-radiocard${entryMode === "form" ? " dart-radiocard--active" : ""}`}>
                  <input type="radio" name="entryMode" value="form" checked={entryMode === "form"} onChange={() => setEntryMode("form")} className="dart-radiocard-input" />
                  <span><strong>Fill out the form online</strong> — answer each section below, then submit electronically.</span>
                </label>
                <label className={`dart-radiocard${entryMode === "upload" ? " dart-radiocard--active" : ""}`}>
                  <input type="radio" name="entryMode" value="upload" checked={entryMode === "upload"} onChange={() => setEntryMode("upload")} className="dart-radiocard-input" />
                  <span><strong>I already have a printed, signed copy</strong> — skip the form and upload a scanned copy instead.</span>
                </label>
              </div>
            </FormCard>

            {entryMode === "upload" ? (
              <UploadWorkflow onBack={() => setEntryMode("form")} />
            ) : (
              <>
                {submitStatus === "success" && (
                  <div role="status" className="dart-alert dart-alert--success">
                    <span className="dart-alert-icon dart-alert-icon--success"><Icon name="check" className="dart-alert-check" /></span>
                    <div>
                      <p className="dart-alert-title">Part B looks complete.</p>
                      <p className="dart-alert-body">Remember it must be submitted together with Part A before the application can be processed.</p>
                    </div>
                  </div>
                )}
                {submitStatus === "error" && Object.keys(errors).length > 0 && (
                  <div role="alert" className="dart-alert dart-alert--warning">
                    <p className="dart-alert-title dart-alert-title--warning">A few required fields still need attention before Part B can be submitted.</p>
                  </div>
                )}

            <form onSubmit={handleSubmit} noValidate>
              {/* SECTION — Professional Information */}
              <FormCard id="professional-info">
                <CardTitle eyebrow="Required" title="Licensed / Certified Health Care Professional" description="Part B must be completed by a licensed or certified health care professional with knowledge of the applicant's functional ability." icon="user" />

                <div className="dart-grid-2">
                  <Field label="Name (please print)" htmlFor="provName" required error={errors.provName}>
                    <TextInput id="provName" name="provName" value={formData.provName} onChange={handleChange} error={errors.provName} />
                  </Field>
                  <Field label="Professional Title" htmlFor="provTitle">
                    <TextInput id="provTitle" name="provTitle" value={formData.provTitle} onChange={handleChange} />
                  </Field>
                </div>
                <div className="dart-grid-2">
                  <Field label="Area of Professional Specialization" htmlFor="provSpecialization">
                    <TextInput id="provSpecialization" name="provSpecialization" value={formData.provSpecialization} onChange={handleChange} />
                  </Field>
                  <Field label="Professional License #" htmlFor="provLicense" required error={errors.provLicense}>
                    <TextInput id="provLicense" name="provLicense" value={formData.provLicense} onChange={handleChange} error={errors.provLicense} />
                  </Field>
                </div>
                <Field label="Clinic or Agency" htmlFor="provClinic" wide>
                  <TextInput id="provClinic" name="provClinic" value={formData.provClinic} onChange={handleChange} />
                </Field>
                <div className="dart-grid-2">
                  <Field label="Address" htmlFor="provAddress">
                    <TextInput id="provAddress" name="provAddress" value={formData.provAddress} onChange={handleChange} />
                  </Field>
                  <Field label="Phone Number" htmlFor="provPhone" required error={errors.provPhone}>
                    <TextInput type="tel" id="provPhone" name="provPhone" value={formData.provPhone} onChange={handleChange} error={errors.provPhone} />
                  </Field>
                </div>
                <Field label="Signature (type full name to sign)" htmlFor="provSignature" required error={errors.provSignature} wide>
                  <TextInput id="provSignature" name="provSignature" value={formData.provSignature} onChange={handleChange} error={errors.provSignature} className="dart-signature" />
                </Field>
              </FormCard>

              {/* SECTION — General Medical or Physical Disability Information */}
              <FormCard id="medical-physical">
                <CardTitle eyebrow="Questions regarding the applicant's disability" title="General Medical or Physical Disability Information" description="Please complete all sections that apply. Incomplete applications will be returned to applicant." icon="heart" />

                <div className="dart-grid-2">
                  <Field label="Applicant has been a patient of mine since" htmlFor="patientSince">
                    <TextInput id="patientSince" name="patientSince" value={formData.patientSince} onChange={handleChange} />
                  </Field>
                  <Field label="Date of applicant's last evaluation" htmlFor="lastEvalDate">
                    <TextInput type="date" id="lastEvalDate" name="lastEvalDate" value={formData.lastEvalDate} onChange={handleChange} />
                  </Field>
                </div>

                <Question number={1} label="Please indicate the nature of your patient's condition or disability. This list is not all inclusive, it lists what we predominantly see on submitted applications.">
                  <CheckboxGroup name="conditions" options={CONDITION_OPTIONS} values={formData.conditions} onToggle={handleCheckboxToggle} columns={3} />

                  {formData.conditions.includes("End Stage Renal Disease") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Dialysis?</label>
                      <RadioGroup name="dialysis" options={YES_NO} value={formData.dialysis} onChange={handleChange} />
                    </div>
                  )}
                  {formData.conditions.includes("Undergoing Cancer Treatment") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Expected duration of cancer treatment</label>
                      <TextInput name="cancerDuration" value={formData.cancerDuration} onChange={handleChange} />
                    </div>
                  )}
                  {formData.conditions.includes("Arthritis") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Arthritis — please specify type and area(s)</label>
                      <TextInput name="arthritisDetail" value={formData.arthritisDetail} onChange={handleChange} />
                    </div>
                  )}
                  {formData.conditions.includes("Amputation") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Amputation — please specify extremity and/or use of prosthesis</label>
                      <TextInput name="amputationDetail" value={formData.amputationDetail} onChange={handleChange} />
                    </div>
                  )}
                  {formData.conditions.includes("Neurological Condition/Cognitive") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Neurological Condition / Cognitive — severity</label>
                      <RadioGroup name="neuroSeverity" options={NEURO_SEVERITY} value={formData.neuroSeverity} onChange={handleChange} />
                    </div>
                  )}
                  {formData.conditions.includes("Pulmonary Disease") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Pulmonary Disease — if on oxygen, what is usage?</label>
                      <TextInput name="mp_oxygenUsage" value={formData.mp_oxygenUsage || ""} onChange={handleChange} />
                    </div>
                  )}
                  {formData.conditions.includes("Hearing Impairment") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Hearing Impairment — specify degree of hearing loss</label>
                      <TextInput name="hearingDegree" value={formData.hearingDegree} onChange={handleChange} />
                    </div>
                  )}
                  {formData.conditions.includes("Other") && (
                    <div className="dart-subfield">
                      <label className="dart-sublabel">Other — please specify</label>
                      <TextInput name="conditionOther" value={formData.conditionOther} onChange={handleChange} />
                    </div>
                  )}
                </Question>

                <Question number={2} label="Is the condition(s) temporary?">
                  <RadioGroup name="mp_temporary" options={YES_NO} value={formData.mp_temporary} onChange={handleChange} />
                  <TextInput className="dart-mt" name="mp_duration" placeholder="If temporary, what is the expected duration?" value={formData.mp_duration} onChange={handleChange} />
                </Question>

                <Question number={3} label="Are there environmental conditions that would have a negative impact on the applicant's condition(s)?">
                  <RadioGroup name="mp_envConditions" options={YES_NO} value={formData.mp_envConditions} onChange={handleChange} />
                  <div className="dart-grid-2 dart-mt">
                    <div><label className="dart-sublabel">What are the conditions?</label><TextInput name="mp_envWhat" value={formData.mp_envWhat} onChange={handleChange} /></div>
                    <div><label className="dart-sublabel">What is the impact?</label><TextInput name="mp_envImpact" value={formData.mp_envImpact} onChange={handleChange} /></div>
                  </div>
                </Question>

                <Question number={4} label="Do you feel the applicant could be trained to independently use regular city buses safely and effectively?">
                  <RadioGroup name="mp_canBeTrained" options={YES_NO} value={formData.mp_canBeTrained} onChange={handleChange} />
                  <div className="dart-subfield">
                    <label className="dart-sublabel">If no, why?</label>
                    <TextArea rows={2} name="mp_trainedWhyNot" value={formData.mp_trainedWhyNot} onChange={handleChange} />
                  </div>
                </Question>

                <Question number={5} label="How far do you feel the applicant could independently propel a wheelchair or ambulate with or without a mobility aid, and without lengthy rest breaks?">
                  <RadioGroup name="mp_mobilityRange" options={MOBILITY_RANGE} value={formData.mp_mobilityRange} onChange={handleChange} />
                  {formData.mp_mobilityRange === "Blocks" && (
                    <TextInput className="dart-mt dart-input--narrow" name="mp_mobilityBlocks" placeholder="Number of blocks (500 feet = 1 block)" value={formData.mp_mobilityBlocks} onChange={handleChange} />
                  )}
                </Question>

                <div className="dart-grid-2">
                  <Question number={6} label="How long can the applicant wait at a bus stop with a bench/shelter?">
                    <TextInput name="mp_waitWithShelter" value={formData.mp_waitWithShelter} onChange={handleChange} />
                  </Question>
                  <Question number={7} label="How long can the applicant wait at a bus stop without a bench/shelter?">
                    <TextInput name="mp_waitWithoutShelter" value={formData.mp_waitWithoutShelter} onChange={handleChange} />
                  </Question>
                </div>

                <Question number={8} label="Seizure Disorders">
                  <div className="dart-grid-2">
                    <div><label className="dart-sublabel">Type(s) of seizures?</label><TextInput name="seizureTypes" value={formData.seizureTypes} onChange={handleChange} /></div>
                    <div><label className="dart-sublabel">How often do the seizures occur?</label><TextInput name="seizureFrequency" value={formData.seizureFrequency} onChange={handleChange} /></div>
                  </div>
                  <div className="dart-subfield">
                    <label className="dart-sublabel">After a seizure, how long does it take before the applicant is able to function safely?</label>
                    <TextInput name="seizureRecoveryTime" value={formData.seizureRecoveryTime} onChange={handleChange} />
                  </div>
                  <div className="dart-subfield">
                    <label className="dart-sublabel">Are the seizures preceded by an aura?</label>
                    <RadioGroup name="seizureAura" options={YES_NO} value={formData.seizureAura} onChange={handleChange} />
                  </div>
                  <div className="dart-subfield">
                    <label className="dart-sublabel">What triggers the applicant's seizure?</label>
                    <TextInput name="seizureTriggers" value={formData.seizureTriggers} onChange={handleChange} />
                  </div>
                  <div className="dart-grid-2 dart-mt">
                    <div><label className="dart-sublabel">Is the applicant taking medication for the seizures?</label><RadioGroup name="seizureMedicated" options={YES_NO} value={formData.seizureMedicated} onChange={handleChange} /></div>
                    <div><label className="dart-sublabel">Are the seizures currently controlled?</label><RadioGroup name="seizureControlled" options={YES_NO} value={formData.seizureControlled} onChange={handleChange} /></div>
                  </div>
                  <div className="dart-grid-2 dart-mt">
                    <div><label className="dart-sublabel">Is he/she able to function safely and effectively in the community?</label><RadioGroup name="seizureFunctionsSafely" options={YES_NO} value={formData.seizureFunctionsSafely} onChange={handleChange} /></div>
                    <div><label className="dart-sublabel">When was the applicant's last seizure?</label><TextInput name="seizureLastDate" value={formData.seizureLastDate} onChange={handleChange} /></div>
                  </div>
                </Question>
              </FormCard>
                </form>
              </>
            )}

            <footer className="dart-footer">
              DART ADA Paratransit Services Application — Part B &middot; Based on the form revised November 15, 2019
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}

const DART_STYLES = `
/* styles omitted for brevity in patch but are unchanged from original snippet */
`;
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/partb')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/partb"!</div>
}
