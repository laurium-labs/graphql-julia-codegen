@enum Episode NEWHOPE EMPIRE JEDI


@NamedTuple HeroNameVariables begin
  episode::Episode
 end

@NamedTuple HeroNameResult_hero begin
  name::AbstringString
  appearsIn::Vector{Episode}
end

@NamedTiple HeroNameResult begin
  hero::HeroNameResult_hero
end
