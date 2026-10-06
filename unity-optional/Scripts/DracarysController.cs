using System.Collections;
using UnityEngine;
using UnityEngine.Playables;

namespace JARVIS.Dracarys
{
    /// <summary>
    /// Sequences the Dracarys cinematic: fly-in, eye glow, roar, fire breath,
    /// camera shake, flash, fly-away, then signals the host app to close.
    ///
    /// This script is complete and functional, but it orchestrates GameObjects
    /// it expects to already exist in the scene -- specifically a rigged dragon
    /// model with an Animator (params below) and a fire ParticleSystem. Neither
    /// of those is included here: a 3D model, rig, and animations are art
    /// assets, not something code generation can produce. Get one from the
    /// Unity Asset Store (search "dragon") or a modeler, wire up the Animator
    /// parameters listed below, and this script will drive it correctly.
    ///
    /// Animator parameters expected on the dragon's Animator:
    ///   trigger "FlyIn", trigger "Roar", trigger "BreatheFire", trigger "FlyAway"
    /// </summary>
    public class DracarysController : MonoBehaviour
    {
        [Header("Wire these up once you have a dragon asset in the scene")]
        [SerializeField] private Animator dragonAnimator;
        [SerializeField] private ParticleSystem fireParticles;
        [SerializeField] private AudioSource roarAudioSource;
        [SerializeField] private AudioClip roarClip;
        [SerializeField] private Light eyeGlowLight;
        [SerializeField] private PlayableDirector timeline; // optional, for a hand-authored cut
        [SerializeField] private Camera cinematicCamera;
        [SerializeField] private CanvasGroup screenFlash;

        [Header("Timing (seconds)")]
        [SerializeField] private float flyInDuration = 1.2f;
        [SerializeField] private float roarDuration = 1.5f;
        [SerializeField] private float fireDuration = 2.0f;
        [SerializeField] private float flyAwayDuration = 1.2f;

        public System.Action OnCinematicComplete;

        private void Start()
        {
            StartCoroutine(PlaySequence());
        }

        private IEnumerator PlaySequence()
        {
            if (timeline != null)
            {
                // Prefer a hand-authored Timeline cut if one is assigned --
                // it gives an artist full control over shot composition.
                timeline.Play();
                yield return new WaitForSeconds((float)timeline.duration);
                OnCinematicComplete?.Invoke();
                yield break;
            }

            // Fallback: procedural sequence driven directly by this script.
            dragonAnimator?.SetTrigger("FlyIn");
            yield return new WaitForSeconds(flyInDuration);

            if (eyeGlowLight != null)
                StartCoroutine(PulseLight(eyeGlowLight, roarDuration));

            dragonAnimator?.SetTrigger("Roar");
            if (roarAudioSource != null && roarClip != null)
                roarAudioSource.PlayOneShot(roarClip);
            StartCoroutine(CameraShake.Shake(cinematicCamera, 0.6f, 0.35f));
            yield return new WaitForSeconds(roarDuration);

            dragonAnimator?.SetTrigger("BreatheFire");
            fireParticles?.Play();
            if (screenFlash != null)
                StartCoroutine(FlashScreen(screenFlash, 0.25f));
            yield return new WaitForSeconds(fireDuration);
            fireParticles?.Stop();

            dragonAnimator?.SetTrigger("FlyAway");
            yield return new WaitForSeconds(flyAwayDuration);

            OnCinematicComplete?.Invoke();
        }

        private IEnumerator PulseLight(Light light, float duration)
        {
            float elapsed = 0f;
            float baseIntensity = light.intensity;
            while (elapsed < duration)
            {
                light.intensity = baseIntensity * (1f + 0.6f * Mathf.Sin(elapsed * 12f));
                elapsed += Time.deltaTime;
                yield return null;
            }
            light.intensity = baseIntensity;
        }

        private IEnumerator FlashScreen(CanvasGroup flash, float duration)
        {
            float elapsed = 0f;
            while (elapsed < duration)
            {
                flash.alpha = Mathf.PingPong(elapsed * 8f, 1f);
                elapsed += Time.deltaTime;
                yield return null;
            }
            flash.alpha = 0f;
        }
    }
}
