using System.Collections;
using UnityEngine;

namespace JARVIS.Dracarys
{
    /// <summary>Simple positional camera shake -- fully functional, no external assets needed.</summary>
    public static class CameraShake
    {
        public static IEnumerator Shake(Camera cam, float duration, float magnitude)
        {
            if (cam == null) yield break;
            Vector3 originalPos = cam.transform.localPosition;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                float damper = 1f - Mathf.Clamp01(elapsed / duration);
                float x = (Random.value * 2f - 1f) * magnitude * damper;
                float y = (Random.value * 2f - 1f) * magnitude * damper;
                cam.transform.localPosition = originalPos + new Vector3(x, y, 0f);
                elapsed += Time.deltaTime;
                yield return null;
            }
            cam.transform.localPosition = originalPos;
        }
    }
}
