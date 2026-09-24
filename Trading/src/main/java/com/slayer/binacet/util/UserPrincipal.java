package com.slayer.binacet.util;

import com.slayer.binacet.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    private final User user;

    private UserPrincipal(User user) {
        this.user = user;
    }

    public static UserPrincipal from(User user) {
        return new UserPrincipal(user);
    }

    public String getId() {
        return user.getId();
    }

    public String getFullName() {
        return user.getFullName();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String roleName = user.getRole() != null ? user.getRole().name() : "USER";
        return List.of(new SimpleGrantedAuthority("ROLE_" + roleName));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}