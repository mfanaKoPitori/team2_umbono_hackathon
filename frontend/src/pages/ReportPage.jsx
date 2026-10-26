import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation, Camera, X, Check, TriangleAlert, LoaderCircle, UserX } from 'lucide-react'
import ResidentHeader from '../components/ResidentHeader'
import Footer from '../components/Footer'
import { Icon } from '../icons.jsx'
import { INCIDENT_TYPES } from '../constants'
import { useLanguage } from '../i18n.jsx'
import { submitIncident, uploadPhoto } from '../api'
import { resizePhoto } from '../utils/resizePhoto'
import './Report.css'

export default function ReportPage() {
  const navigate = useNavigate()
  const { t, typeLabel } = useLanguage()
  const fileInputRef = useRef(null)

  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0].value)
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [reporterName, setReporterName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device')
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setLocationError(err.message || 'Could not get your location')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const clientErrors = []
    if (!description.trim()) clientErrors.push(t('errorDescription'))
    if (!location.trim() && !coords) clientErrors.push(t('errorLocation'))
    if (clientErrors.length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    setErrors([])
    try {
      // The report matters more than the photo: if the photo can't be
      // processed or uploaded, send the report without it and say so on the
      // confirmation page.
      let photoUrl = null
      let wasPhotoDropped = false
      if (photoFile) {
        try {
          photoUrl = await uploadPhoto(await resizePhoto(photoFile))
        } catch (err) {
          console.warn('Photo upload failed; sending the report without it', err)
          wasPhotoDropped = true
        }
      }
      const payload = {
        incidentType,
        location: location.trim(),
        description: description.trim(),
        isAnonymous,
        ...(isAnonymous ? {} : { reporterName: reporterName.trim() }),
        ...(coords ?? {}),
        ...(photoUrl ? { photoUrl } : {}),
      }
      const data = await submitIncident(payload)
      navigate(`/submitted/${data.incidentId}`, { state: { wasPhotoDropped } })
    } catch (err) {
      setErrors(err.details?.length ? err.details : [err.message || t('errorGeneric')])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page report">
      <ResidentHeader />

      <form className="report__form" onSubmit={handleSubmit}>
        <div className="report__intro">
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>

        <div className="type-grid">
          {INCIDENT_TYPES.map((type) => {
            const active = incidentType === type.value
            return (
              <button
                key={type.value}
                type="button"
                className={`type-tile ${active ? 'is-selected' : ''}`}
                onClick={() => setIncidentType(type.value)}
              >
                <Icon name={type.icon} size={22} />
                <span>{typeLabel(type.value)}</span>
              </button>
            )
          })}
        </div>

        <label className="field">
          <span className="field__label">{t('whereLabel')}</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Rivonia Rd &amp; Grayston Dr"
          />
        </label>

        <div className="location-capture">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={useMyLocation}
            disabled={locating}
          >
            {locating ? <LoaderCircle size={16} className="spin" /> : <Navigation size={16} />}
            {t('useLocation')}
          </button>
          {coords && (
            <span className="location-capture__status location-capture__status--ok">
              <Check size={14} /> {t('locationFound')}
            </span>
          )}
          {locationError && (
            <span className="location-capture__status location-capture__status--error">
              <TriangleAlert size={14} /> {locationError}
            </span>
          )}
        </div>

        <div className="field">
          <button type="button" className="btn btn--secondary btn--block" onClick={() => fileInputRef.current?.click()}>
            <Camera size={18} />
            {t('addPhoto')}
          </button>
          <span className="field__helper">{t('photoHelper')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          {photoPreview && (
            <div className="photo-preview">
              <img src={photoPreview} alt="Selected incident" />
              <button type="button" className="photo-preview__remove" onClick={removePhoto} aria-label="Remove photo">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <label className="field">
          <span className="field__label">{t('tellUsMore')}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={t('tellUsMore')}
          />
        </label>

        <div className="field anonymous-toggle">
          <button
            type="button"
            role="switch"
            aria-checked={isAnonymous}
            className={`switch ${isAnonymous ? 'is-on' : ''}`}
            onClick={() => setIsAnonymous((v) => !v)}
          >
            <span className="switch__thumb" />
          </button>
          <span className="anonymous-toggle__text">
            <UserX size={16} />
            <span>
              {t('anonymousToggle')}
              <small>{t('anonymousHelper')}</small>
            </span>
          </span>
        </div>

        <AnimatePresence initial={false}>
          {!isAnonymous && (
            <motion.label
              className="field"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <span className="field__label">{t('yourName')}</span>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
              />
            </motion.label>
          )}
        </AnimatePresence>

        {errors.length > 0 && (
          <div className="alert alert--error">
            <TriangleAlert size={16} />
            <div>
              {errors.length === 1 ? (
                <span>{errors[0]}</span>
              ) : (
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="report__spacer" />

        <div className="report__submit-bar">
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? (
              <>
                <LoaderCircle size={18} className="spin" /> {t('sending')}
              </>
            ) : (
              t('sendReport')
            )}
          </button>
        </div>
      </form>

      <Footer />
    </div>
  )
}
