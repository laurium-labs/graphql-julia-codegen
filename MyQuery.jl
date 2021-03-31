# @generated
# This file was automatically generated and should not be edited.

const MyQueryResult_viewer = @NamedTuple begin
  login::AbstractString
end

const MyQueryResult = @NamedTuple begin
  viewer::MyQueryResult_viewer
end
