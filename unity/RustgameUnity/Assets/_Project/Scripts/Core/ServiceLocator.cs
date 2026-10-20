using System;
using System.Collections.Generic;

namespace Rustgame.Core
{
    /// <summary>
    /// Minimal service locator — deliberately not a full DI framework (Zenject etc.)
    /// because this project's system count doesn't justify the extra dependency.
    /// GameManager registers each core system here on boot; other systems fetch
    /// them by type instead of using scattered singletons.
    /// </summary>
    public static class ServiceLocator
    {
        static readonly Dictionary<Type, object> services = new Dictionary<Type, object>();

        public static void Register<T>(T service) where T : class
        {
            if (service == null) return;
            services[typeof(T)] = service;
        }

        /// <summary>Removes a registration. Systems call this from OnDestroy so a
        /// destroyed service is never handed out by Get().</summary>
        public static void Unregister<T>() where T : class
        {
            services.Remove(typeof(T));
        }

        public static T Get<T>() where T : class
        {
            object service;
            return services.TryGetValue(typeof(T), out service) ? (T)service : null;
        }

        public static bool TryGet<T>(out T service) where T : class
        {
            object raw;
            if (services.TryGetValue(typeof(T), out raw))
            {
                service = (T)raw;
                return true;
            }
            service = null;
            return false;
        }

        /// <summary>Call when leaving the gameplay scene / on domain reload in tests.</summary>
        public static void Clear() { services.Clear(); }
    }
}
